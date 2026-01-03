import { useState, useEffect } from 'react';
import { db } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';

const Profile = () => {
  const { user, userData } = useAuth();
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    totalRequests: 0,
    avgRating: 0,
  });
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;

      try {
        // Fetch deliveries as partner
        const partnerDeliveries = await db.deliveries.getByPartner(user.id);
        const completedPartner = partnerDeliveries.filter(d => d.status === 'completed').slice(0, 5);
        
        // Fetch deliveries as sender
        const senderDeliveries = await db.deliveries.getBySender(user.id);
        const completedSender = senderDeliveries.filter(d => d.status === 'completed').slice(0, 5);

        // Calculate stats
        let totalDeliveries = completedPartner.length;
        let totalRating = 0;
        let ratingCount = 0;
        const recent = [];

        completedPartner.forEach((delivery) => {
          if (delivery.rating) {
            totalRating += delivery.rating;
            ratingCount++;
          }
          recent.push({ ...delivery, role: 'partner' });
        });

        completedSender.forEach((delivery) => {
          recent.push({ ...delivery, role: 'sender' });
        });

        setStats({
          totalDeliveries,
          totalRequests: completedSender.length,
          avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0,
        });

        // Sort recent deliveries by date
        recent.sort((a, b) => {
          const aDate = new Date(a.completed_at || a.created_at).getTime();
          const bDate = new Date(b.completed_at || b.created_at).getTime();
          return bDate - aDate;
        });

        setRecentDeliveries(recent.slice(0, 5));
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-cream">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-3xl shadow-medium p-8 mb-6">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-primary-500 rounded-full flex items-center justify-center text-4xl font-bold text-dark">
              {userData?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            
            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-h1 font-bold mb-2">{userData?.full_name || 'User'}</h1>
              <p className="text-gray-600 mb-1">{userData?.email}</p>
              <p className="text-gray-600">{userData?.phone}</p>
            </div>

            {/* Reward Points */}
            <div className="text-center">
              <p className="text-gray-700 mb-1">Reward Points</p>
              <p className="text-3xl font-bold text-primary-600">
                {userData?.reward_points || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-medium p-6 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-dark mb-1">{stats.totalDeliveries}</p>
            <p className="text-gray-600">Deliveries Completed</p>
          </div>

          <div className="bg-white rounded-2xl shadow-medium p-6 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-dark mb-1">{stats.totalRequests}</p>
            <p className="text-gray-600">Requests Made</p>
          </div>

          <div className="bg-white rounded-2xl shadow-medium p-6 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-dark mb-1">{stats.avgRating}</p>
            <p className="text-gray-600">Average Rating</p>
          </div>
        </div>

        {/* Recent Deliveries */}
        <div className="bg-white rounded-3xl shadow-medium p-6">
          <h2 className="text-h2 font-semibold mb-4">Recent Deliveries</h2>
          
          {recentDeliveries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No completed deliveries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{delivery.item_name}</h3>
                      <p className="text-sm text-gray-600">
                        {delivery.role === 'partner' ? 'As Delivery Partner' : 'As Sender'}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Completed
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Distance:</span>
                      <span className="ml-1 font-medium">{delivery.distance} km</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Amount:</span>
                      <span className="ml-1 font-medium">Rs. {delivery.delivery_amount}</span>
                    </div>
                    {delivery.rating && (
                      <div>
                        <span className="text-gray-600">Rating:</span>
                        <span className="ml-1 font-medium">{delivery.rating} ★</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <span className="ml-1 font-medium">
                        {delivery.completed_at
                          ? new Date(delivery.completed_at).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

