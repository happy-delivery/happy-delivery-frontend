import { useState, useEffect, useRef } from 'react';
import { supabase, db } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

// Cache for sender names to avoid repeated database calls (module-level cache)
const senderNameCache = new Map();

const ChatInterface = ({ deliveryId, onClose }) => {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pinnedAmount, setPinnedAmount] = useState(null);
  const [tempAmount, setTempAmount] = useState('');
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat and messages
  useEffect(() => {
    if (!deliveryId) return;

    const loadChat = async () => {
      try {
        // Get or create chat
        let chat = await db.chats.getByDelivery(deliveryId);
        
        if (!chat) {
          // Chat doesn't exist yet, will be created when delivery is accepted
          return;
        }

        setChatId(chat.id);
        
        // Load pinned amount
        if (chat.agreed_amount) {
          setPinnedAmount({
            amount: chat.agreed_amount,
            confirmed: true,
          });
        }

        // Load existing messages
        const existingMessages = await db.chats.getMessages(chat.id);
        
        // Get unique sender IDs (excluding system messages and current user)
        const uniqueSenderIds = [...new Set(
          existingMessages
            .filter(msg => !msg.is_system && msg.sender_id !== user?.id)
            .map(msg => msg.sender_id)
        )];
        
        // Fetch all sender names in one batch
        const senderNamesMap = new Map();
        if (uniqueSenderIds.length > 0) {
          try {
            const { data: senders, error: sendersError } = await supabase
              .from('users')
              .select('id, full_name')
              .in('id', uniqueSenderIds);
            
            if (!sendersError && senders) {
              senders.forEach(sender => {
                const name = sender.full_name || 'User';
                senderNamesMap.set(sender.id, name);
                senderNameCache.set(sender.id, name);
              });
            }
          } catch (err) {
            console.error('Error fetching sender names:', err);
          }
        }
        
        // Map messages with sender names
        const messagesWithNames = existingMessages.map((msg) => {
          let senderName = 'User';
          if (msg.is_system) {
            senderName = 'System';
          } else if (msg.sender_id === user?.id) {
            senderName = userData?.full_name || 'You';
          } else {
            senderName = senderNamesMap.get(msg.sender_id) || senderNameCache.get(msg.sender_id) || 'User';
          }
          return {
            id: msg.id,
            senderId: msg.sender_id,
            senderName: senderName,
            text: msg.content,
            timestamp: msg.created_at,
            type: msg.is_system ? 'system' : 'user',
          };
        });
        setMessages(messagesWithNames);
      } catch (error) {
        console.error('Error loading chat:', error);
      }
    };

    loadChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          // Determine sender name quickly without blocking database call
          let senderName = 'User';
          if (newMsg.is_system) {
            senderName = 'System';
          } else if (newMsg.sender_id === user?.id) {
            senderName = userData?.full_name || 'You';
          }
          
          // Add message immediately (non-blocking)
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            
            // Check if we have this sender's name in existing messages (cache)
            const existingMsg = prev.find(m => m.senderId === newMsg.sender_id);
            const cachedName = existingMsg ? existingMsg.senderName : senderName;
            
            const newMessage = {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              senderName: cachedName,
              text: newMsg.content,
              timestamp: newMsg.created_at,
              type: newMsg.is_system ? 'system' : 'user',
            };
            
            // If we don't have the name cached and it's not system/current user, fetch it asynchronously
            if (!newMsg.is_system && newMsg.sender_id !== user?.id && !existingMsg) {
              // Check cache first
              if (senderNameCache.has(newMsg.sender_id)) {
                const cachedName = senderNameCache.get(newMsg.sender_id);
                setMessages(prevMsgs => prevMsgs.map(m => 
                  m.id === newMsg.id ? { ...m, senderName: cachedName } : m
                ));
              } else {
                // Fetch and cache
                db.users.get(newMsg.sender_id).then(sender => {
                  if (sender?.full_name) {
                    senderNameCache.set(newMsg.sender_id, sender.full_name);
                    setMessages(prevMsgs => prevMsgs.map(m => 
                      m.id === newMsg.id ? { ...m, senderName: sender.full_name } : m
                    ));
                  }
                }).catch(() => {
                  // Ignore errors, keep default 'User'
                });
              }
            }
            
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Subscribe to chat updates (for pinned amount)
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat-updates:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats',
          filter: `id=eq.${chatId}`,
        },
        (payload) => {
          const updated = payload.new;
          if (updated.agreed_amount !== null && updated.agreed_amount !== undefined) {
            setPinnedAmount(prev => ({
              amount: updated.agreed_amount,
              confirmed: prev?.confirmed || false,
              pinnedBy: prev?.pinnedBy,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  // Send message with optimistic UI
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !chatId) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately
    setSending(true);

    // Optimistic update - show message immediately
    const tempMessage = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      senderName: userData?.full_name || 'You',
      text: messageText,
      timestamp: new Date().toISOString(),
      type: 'user',
      pending: true, // Mark as pending
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      await db.chats.addMessage(chatId, {
        sender_id: user.id,
        content: messageText,
        is_system: false,
      });

      // Remove temp message - real-time subscription will add the actual message
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      
      // The real-time subscription should handle adding the message, but if it doesn't, add it manually after a delay
      setTimeout(() => {
        setMessages(prev => {
          // Check if message was already added by real-time subscription
          const messageExists = prev.some(m => 
            m.senderId === user.id && 
            m.text === messageText && 
            Math.abs(new Date(m.timestamp).getTime() - Date.now()) < 5000
          );
          
          if (!messageExists) {
            // Add the message manually if real-time didn't work
            return [...prev, {
              id: `manual-${Date.now()}`,
              senderId: user.id,
              senderName: userData?.full_name || 'You',
              text: messageText,
              timestamp: new Date().toISOString(),
              type: 'user',
            }];
          }
          return prev;
        });
      }, 1000); // 1 second delay to let real-time subscription work first
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Pin amount
  const handlePinAmount = async () => {
    if (!tempAmount || parseFloat(tempAmount) <= 0 || !chatId) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const amount = parseFloat(tempAmount);
      // Update chat with pinned amount using db helper
      await db.chats.update(chatId, {
        agreed_amount: amount,
      });

      // Add system message (use current user's ID as sender_id, but mark as system)
      await db.chats.addMessage(chatId, {
        sender_id: user.id, // Use current user's ID (required by schema)
        content: `${userData?.full_name || 'User'} pinned amount: Rs. ${amount}`,
        is_system: true, // Mark as system message
      });

      // Update local state - the real-time subscription will also update it
      setPinnedAmount({
        amount: amount,
        confirmed: false,
        pinnedBy: user.id,
      });
      setTempAmount('');
      
      // Reload messages to show the system message
      try {
        const existingMessages = await db.chats.getMessages(chatId);
        setMessages(existingMessages.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.is_system ? 'System' : (msg.sender_id === user.id ? (userData?.full_name || 'You') : 'User'),
          text: msg.content,
          timestamp: msg.created_at,
          type: msg.is_system ? 'system' : 'user',
        })));
      } catch (err) {
        console.error('Error reloading messages:', err);
      }
    } catch (error) {
      console.error('Error pinning amount:', error);
      alert('Failed to pin amount: ' + (error.message || 'Unknown error'));
    }
  };

  // Confirm pinned amount
  const handleConfirmAmount = async () => {
    if (!chatId || !pinnedAmount) return;

    try {
      // Mark the amount as confirmed in the chat
      await db.chats.update(chatId, {
        agreed_amount: pinnedAmount.amount,
      });

      // Add system message (use current user's ID as sender_id, but mark as system)
      await db.chats.addMessage(chatId, {
        sender_id: user.id, // Use current user's ID (required by schema)
        content: `Final agreed amount: Rs. ${pinnedAmount.amount}`,
        is_system: true, // Mark as system message
      });

      // Update local state
      setPinnedAmount({
        ...pinnedAmount,
        confirmed: true,
      });
      
      // Reload messages to show the system message
      try {
        const existingMessages = await db.chats.getMessages(chatId);
        setMessages(existingMessages.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.is_system ? 'System' : (msg.sender_id === user.id ? (userData?.full_name || 'You') : 'User'),
          text: msg.content,
          timestamp: msg.created_at,
          type: msg.is_system ? 'system' : 'user',
        })));
      } catch (err) {
        console.error('Error reloading messages:', err);
      }
    } catch (error) {
      console.error('Error confirming amount:', error);
      alert('Failed to confirm amount: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-medium p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-h3 font-semibold">Chat</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto mb-4 space-y-3 p-4 bg-gray-50 rounded-lg">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${
                message.type === 'system'
                  ? 'message-system'
                  : message.senderId === user?.id
                  ? 'message-sent'
                  : 'message-received'
              } ${message.pending ? 'opacity-70' : ''}`}
            >
              {message.type !== 'system' && (
                <p className="text-xs opacity-75 mb-1">{message.senderName}</p>
              )}
              <p>{message.text}</p>
              {message.pending ? (
                <p className="text-xs opacity-60 mt-1 italic">Sending...</p>
              ) : (
                <p className="text-xs opacity-60 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pinned Amount Display */}
      {pinnedAmount && (
        <div className={`mb-4 p-3 rounded-lg ${pinnedAmount.confirmed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border`}>
          <p className="font-semibold">
            {pinnedAmount.confirmed ? 'Final Agreed Amount:' : 'Proposed Amount:'}
            <span className="text-lg ml-2">Rs. {pinnedAmount.amount}</span>
          </p>
          {!pinnedAmount.confirmed && pinnedAmount.pinnedBy !== user?.id && (
            <button
              onClick={handleConfirmAmount}
              className="mt-2 btn-primary px-4 py-1 text-sm"
            >
              Confirm Amount
            </button>
          )}
        </div>
      )}

      {/* Pin Amount Section */}
      {!pinnedAmount?.confirmed && (
        <div className="mb-4 flex gap-2">
          <input
            type="number"
            value={tempAmount}
            onChange={(e) => setTempAmount(e.target.value)}
            placeholder="Enter amount"
            className="input-field flex-1"
            min="0"
            step="0.01"
          />
          <button
            onClick={handlePinAmount}
            className="btn-secondary px-4 py-2 whitespace-nowrap"
          >
            Pin Amount
          </button>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="input-field flex-1"
          disabled={sending || !chatId}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending || !chatId}
          className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
