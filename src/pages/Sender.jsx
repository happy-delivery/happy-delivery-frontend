import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import DeliveryMap from '../components/DeliveryMap';
import ChatInterface from '../components/ChatInterface';
import api from '../utils/api';

const Sender = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deliveryId = searchParams.get('deliveryId');
  const { user } = useAuth();

  const [delivery, setDelivery] = useState(null);
  const [partnerLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Fetch delivery data (polling instead of real-time to save quota)
  useEffect(() => {
    if (!deliveryId) {
      navigate('/');
      return;
    }

    const fetchDelivery = async () => {
      try {
        const deliveryData = await db.deliveries.get(deliveryId);
        setDelivery(deliveryData);
        setLoading(false);

        // Check authorization
        if (deliveryData.sender_id !== user?.id) {
          alert('Unauthorized access');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching delivery:', error);
        alert('Delivery not found');
        navigate('/');
      }
    };

    fetchDelivery();
    
    // Poll every 10 seconds instead of real-time
    const interval = setInterval(fetchDelivery, 10000);

    return () => clearInterval(interval);
  }, [deliveryId, user, navigate]);

  // Handle item verification
  const handleVerifyItem = async (accepted) => {
    if (!delivery) return;

    setVerifying(true);
    try {
      if (accepted) {
        await db.deliveries.update(deliveryId, {
          status: 'picked_up',
          item_verified: true,
          item_verified_at: new Date().toISOString(),
        });
        alert('Item verified! Delivery partner is now heading to destination.');
      } else {
        // Handle rejection
        alert('Item verification rejected. Please contact the delivery partner.');
        await db.deliveries.update(deliveryId, {
          status: 'accepted', // Keep at accepted, waiting for partner to re-upload
        });
      }
    } catch (error) {
      console.error('Error verifying item:', error);
      alert('Failed to verify item');
    } finally {
      setVerifying(false);
    }
  };

  // Handle delivery confirmation
  const handleConfirmDelivery = async () => {
    if (!delivery) return;

    try {
      // Update to completed status with completed_at timestamp
      await db.deliveries.update(deliveryId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      // Navigate to completion screen
      navigate(`/completion?deliveryId=${deliveryId}`);
    } catch (error) {
      console.error('Error confirming delivery:', error);
      // If completed_at column doesn't exist, try with delivered_at
      if (error.message?.includes('completed_at')) {
        try {
          await db.deliveries.update(deliveryId, {
            status: 'completed',
            delivered_at: new Date().toISOString(),
          });
          navigate(`/completion?deliveryId=${deliveryId}`);
        } catch (fallbackError) {
          alert('Failed to confirm delivery: ' + (fallbackError.message || 'Unknown error'));
        }
      } else {
        alert('Failed to confirm delivery: ' + (error.message || 'Unknown error'));
      }
    }
  };

  // Handle dispute
  const handleDispute = async () => {
    if (!delivery) return;

    const confirmed = window.confirm(
      'Are you sure the item was not delivered? This will open a dispute.'
    );

    if (!confirmed) return;

    try {
      await db.deliveries.update(deliveryId, {
        status: 'disputed',
      });

      alert('Dispute opened. Please resolve via chat or contact support.');
    } catch (error) {
      console.error('Error opening dispute:', error);
      alert('Failed to open dispute');
    }
  };

  // Handle cancellation
  const handleCancel = async () => {
    if (!delivery || !user) return;

    let message = '';

    if (delivery.status === 'pending') {
      message = 'Are you sure you want to cancel this delivery request?';
    } else if (delivery.status === 'accepted') {
      message = 'Delivery partner is on the way. Cancel anyway? You may need to negotiate cancellation charges in chat.';
    } else if (delivery.status === 'picked_up' || delivery.status === 'in_transit') {
      message = 'Item verification is complete. Emergency cancellation may cause disputes. Are you sure you want to cancel?';
    } else {
      alert('Delivery cannot be cancelled in current status');
      return;
    }

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    try {
      // Use API endpoint for cancellation to ensure proper RLS handling
      const response = await api.put(`/api/deliveries/${deliveryId}/cancel`, {
        reason: delivery.status === 'picked_up' || delivery.status === 'in_transit' 
          ? 'Emergency cancellation by sender' 
          : 'Cancelled by sender',
        cancelled_by: user.id,
      });

      if (response.data) {
        alert('Delivery cancelled successfully');
        navigate('/');
      }
    } catch (error) {
      console.error('Error cancelling delivery:', error);
      alert('Failed to cancel delivery: ' + (error.response?.data?.error || error.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!delivery) {
    return null;
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'status-pending',
      accepted: 'status-accepted',
      verified: 'status-verified',
      in_transit: 'status-in-transit',
      delivered: 'status-delivered',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      disputed: 'status-disputed',
    };
    return colors[status] || 'bg-gray-200';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Waiting for delivery partner',
      accepted: 'Partner on the way to pickup',
      verified: 'Delivery in progress',
      in_transit: 'Delivery in progress',
      delivered: 'Awaiting confirmation',
      completed: 'Completed',
      cancelled: 'Cancelled',
      disputed: 'Disputed',
    };
    return texts[status] || status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-cream">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Bar */}
        <div className={`${getStatusColor(delivery.status)} px-6 py-4 rounded-lg mb-6 text-center`}>
          <p className="font-semibold text-lg">{getStatusText(delivery.status)}</p>
        </div>

        {/* Delivery Info */}
        <div className="bg-white rounded-3xl shadow-medium p-6 mb-6">
          <h2 className="text-h2 font-semibold mb-4">Delivery Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
              <p className="text-lg">{delivery.item_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <p className="text-lg font-semibold text-primary-600">
                Rs. {delivery.delivery_amount}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Distance</label>
              <p className="text-lg">{delivery.distance} km</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit</label>
              <p className="text-lg">{delivery.time_limit} minutes</p>
            </div>
          </div>

          {delivery.delivery_partner_id && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800">
                Delivery Partner Assigned
              </p>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="bg-white rounded-3xl shadow-medium p-6 mb-6">
          <h3 className="text-h3 font-semibold mb-4">Tracking</h3>
          <DeliveryMap
            deliveries={[]}
            userLocation={
              delivery.destination_lat && delivery.destination_lng
                ? { lat: delivery.destination_lat, lng: delivery.destination_lng }
                : null
            }
            partnerLocation={partnerLocation}
            selectedDelivery={delivery}
            height="400px"
          />
        </div>

        {/* Item Verification */}
        {delivery.status === 'accepted' && delivery.item_photo_url && (
          <div className="bg-white rounded-3xl shadow-medium p-6 mb-6 fade-in">
            <h3 className="text-h3 font-semibold mb-4">Item Verification</h3>
            <p className="text-gray-700 mb-4">
              Please verify this is the correct item:
            </p>
            <img
              src={delivery.item_photo_url}
              alt="Item"
              className="w-full max-w-md mx-auto rounded-lg mb-4"
            />
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleVerifyItem(true)}
                disabled={verifying}
                className="btn-primary px-8 py-3 disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Accept'}
              </button>
              <button
                onClick={() => handleVerifyItem(false)}
                disabled={verifying}
                className="btn-outline px-8 py-3 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Delivery Confirmation */}
        {delivery.status === 'delivered' && delivery.delivery_photo_url && (
          <div className="bg-white rounded-3xl shadow-medium p-6 mb-6 fade-in">
            <h3 className="text-h3 font-semibold mb-4">Delivery Confirmation</h3>
            <p className="text-gray-700 mb-4">
              Delivery proof:
            </p>
            <img
              src={delivery.delivery_photo_url}
              alt="Delivery Proof"
              className="w-full max-w-md mx-auto rounded-lg mb-4"
            />
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleConfirmDelivery}
                className="btn-primary px-8 py-3"
              >
                Confirm Received
              </button>
              <button
                onClick={handleDispute}
                className="btn-outline px-8 py-3"
              >
                Item Not Received
              </button>
            </div>
          </div>
        )}

        {/* Chat Section */}
        {delivery.status !== 'pending' && delivery.status !== 'cancelled' && (
          <div className="mb-6">
            <ChatInterface deliveryId={deliveryId} />
          </div>
        )}

        {/* Cancel Button */}
        {!['completed', 'cancelled'].includes(delivery.status) && (
          <div className="text-center mb-6">
            <button
              onClick={handleCancel}
              className="btn-outline px-4 sm:px-8 py-3 text-red-600 border-red-600 hover:bg-red-50 w-full sm:w-auto text-sm sm:text-base rounded-lg font-medium"
            >
              {delivery.status === 'picked_up' || delivery.status === 'in_transit'
                ? 'Emergency Cancel'
                : delivery.status === 'accepted'
                ? 'Cancel Delivery'
                : 'Cancel Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sender;

