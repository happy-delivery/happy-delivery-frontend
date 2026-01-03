import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
  },
});

// Database helper functions
export const db = {
  // Users
  users: {
    get: async (userId) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() to return null instead of error if not found
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    },
    create: async (userData) => {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (userId, updates) => {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },
  // Deliveries
  deliveries: {
    get: async (deliveryId) => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', deliveryId)
        .single();
      if (error) throw error;
      return data;
    },
    create: async (deliveryData) => {
      const { data, error } = await supabase
        .from('deliveries')
        .insert(deliveryData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (deliveryId, updates) => {
      const { data, error } = await supabase
        .from('deliveries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', deliveryId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    getBySender: async (senderId) => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('sender_id', senderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    getByPartner: async (partnerId) => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('delivery_partner_id', partnerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    getActiveBySender: async (senderId) => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('sender_id', senderId)
        .in('status', ['pending', 'accepted', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    getActiveByPartner: async (partnerId) => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('delivery_partner_id', partnerId)
        .in('status', ['accepted', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    getNearby: async (lat, lng, radius = 10) => {
      // Use PostGIS or calculate distance in query
      // For now, we'll use a simple bounding box approach
      // In production, use PostGIS extension for accurate distance calculation
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('status', 'pending')
        .is('delivery_partner_id', null);
      
      if (error) throw error;
      
      // Filter by distance (simple calculation)
      return data.filter((delivery) => {
        const distance = calculateDistance(
          lat,
          lng,
          delivery.source_lat,
          delivery.source_lng
        );
        return distance <= radius;
      });
    },
  },
  // Chats
  chats: {
    get: async (chatId) => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();
      if (error) throw error;
      return data;
    },
    getByDelivery: async (deliveryId) => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('delivery_id', deliveryId)
        .maybeSingle(); // Use maybeSingle to return null instead of error if not found
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    },
    create: async (chatData) => {
      const { data, error } = await supabase
        .from('chats')
        .insert(chatData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (chatId, updates) => {
      const { data, error } = await supabase
        .from('chats')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', chatId)
        .select();
      if (error) throw error;
      // Return first result or null if no rows updated
      return data && data.length > 0 ? data[0] : null;
    },
    addMessage: async (chatId, messageData) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          ...messageData,
          chat_id: chatId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    getMessages: async (chatId) => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  },
};

// Helper function to calculate distance (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

