import { useState, useEffect } from 'react';
import { db } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import DeliveryMap from '../components/DeliveryMap';
import ImageUpload from '../components/ImageUpload';
import ChatInterface from '../components/ChatInterface';
import useGeolocation from '../hooks/useGeolocation';
import api from '../utils/api';

const DeliveryPartner = () => {
  const { user, userData, updateUserLocation, updateUserAvailability } = useAuth();
  const { location: geoLocation, error: geoError } = useGeolocation(true);

  const [deliveries, setDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finding, setFinding] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Update user location when geolocation changes
  useEffect(() => {
    if (geoLocation && user) {
      updateUserLocation(geoLocation.lat, geoLocation.lng);
    }
  }, [geoLocation, user, updateUserLocation]);

  // Check for active delivery assigned to this partner (polling)
  useEffect(() => {
    if (!user) return;

    const checkActiveDelivery = async () => {
      try {
        const deliveries = await db.deliveries.getActiveByPartner(user.id);
        const current = deliveries.find(d => 
          ['accepted', 'picked_up', 'in_transit', 'delivered'].includes(d.status)
        );
        setActiveDelivery(current || null);
      } catch (error) {
        console.error('Error checking active delivery:', error);
      }
    };

    checkActiveDelivery();
    const interval = setInterval(checkActiveDelivery, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch nearby deliveries
  const fetchNearbyDeliveries = async () => {
    if (!geoLocation) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/api/deliveries/nearby', {
        params: {
          lat: geoLocation.lat,
          lng: geoLocation.lng,
          radius: 10, // 10 km radius
        },
      });
      setDeliveries(response.data.deliveries || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle find deliveries button
  const handleFindDeliveries = async () => {
    setFinding(true);
    await updateUserAvailability(true);
    await fetchNearbyDeliveries();
    setFinding(false);
  };

  // Handle accept delivery
  const handleAcceptDelivery = async (delivery) => {
    if (!userData) return;

    setAcceptingId(delivery.id);
    try {
      await api.put(`/api/deliveries/${delivery.id}/accept`, {
        partnerName: userData?.full_name || 'Delivery Partner',
        partnerPhone: userData?.phone || '',
      });

      // Show confirmation and switch to active delivery view
      alert('Delivery accepted successfully!');
      setActiveDelivery({
        ...delivery,
        id: delivery.id,
        status: 'accepted',
        delivery_partner_id: user.id,
      });
      setSelectedDelivery(null);
    } catch (error) {
      console.error('Error accepting delivery:', error);
      alert(error.response?.data?.error || 'Failed to accept delivery');
    } finally {
      setAcceptingId(null);
    }
  };

  // Handle item photo upload and verification (via backend -> Supabase Storage)
  const handleItemVerification = async (imageFile) => {
    if (!activeDelivery) return;

    setUploading(true);
    try {
      console.log('Starting item photo upload...', {
        deliveryId: activeDelivery.id,
        fileSize: imageFile.size,
        fileName: imageFile.name,
      });

      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('deliveryId', activeDelivery.id);
      formData.append('type', 'item');

      const response = await api.post('/api/deliveries/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 second timeout
      });

      console.log('Upload response:', response.data);

      if (!response.data.imageUrl) {
        throw new Error('No image URL returned from server');
      }

      const imageUrl = response.data.imageUrl;

      await db.deliveries.update(activeDelivery.id, {
        item_photo_url: imageUrl,
      });

      alert('Item photo uploaded successfully! Waiting for sender verification.');
      setActiveDelivery((prev) => (prev ? { ...prev, item_photo_url: imageUrl } : prev));
    } catch (error) {
      console.error('Error uploading item photo:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload photo. Please check your connection and try again.';
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle delivery completion (proof photo via backend -> Supabase Storage)
  const handleMarkDelivered = async (imageFile) => {
    if (!activeDelivery) return;

    setUploading(true);
    try {
      console.log('Starting delivery proof upload...', {
        deliveryId: activeDelivery.id,
        fileSize: imageFile.size,
        fileName: imageFile.name,
      });

      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('deliveryId', activeDelivery.id);
      formData.append('type', 'delivery');

      const response = await api.post('/api/deliveries/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 second timeout
      });

      console.log('Upload response:', response.data);

      if (!response.data.imageUrl) {
        throw new Error('No image URL returned from server');
      }

      const imageUrl = response.data.imageUrl;

      await db.deliveries.update(activeDelivery.id, {
        delivery_photo_url: imageUrl,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      });

      alert('Delivery proof uploaded successfully! Waiting for sender confirmation.');
      setActiveDelivery((prev) =>
        prev
          ? {
              ...prev,
              delivery_photo_url: imageUrl,
              status: 'delivered',
            }
          : prev
      );
    } catch (error) {
      console.error('Error marking delivery as delivered:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload photo. Please check your connection and try again.';
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle cancellation from partner side
  const handleCancelDelivery = async () => {
    if (!activeDelivery || !user) return;

    // Determine cancellation message based on status
    let message = 'Are you sure you want to cancel this delivery?';
    
    if (activeDelivery.status === 'picked_up' || activeDelivery.status === 'in_transit') {
      message = 'Item verification is complete. Emergency cancellation may cause disputes. Are you sure you want to cancel?';
    }

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    try {
      // Use API endpoint for cancellation to ensure proper RLS handling
      const response = await api.put(`/api/deliveries/${activeDelivery.id}/cancel`, {
        reason: activeDelivery.status === 'picked_up' || activeDelivery.status === 'in_transit' 
          ? 'Emergency cancellation by delivery partner' 
          : 'Cancelled by delivery partner',
      });

      if (response.data) {
        alert('Delivery cancelled successfully');
        setActiveDelivery(null);
        setDeliveries([]);
        setSelectedDelivery(null);
        // Refresh nearby deliveries to show this one again if it was pending
        if (geoLocation) {
          await fetchNearbyDeliveries();
        }
      }
    } catch (error) {
      console.error('Error cancelling delivery:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to cancel delivery';
      alert(`Failed to cancel delivery: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-cream">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Delivery View */}
        {activeDelivery ? (
          <>
            <div className="mb-6 bg-primary px-4 py-4 rounded-3xl text-center">
              <h2 className="text-h2 font-bold">Active Delivery</h2>
              <p className="text-sm mt-1">
                Status: {activeDelivery.status.replace('_', ' ').toUpperCase()}
              </p>
            </div>

            {/* Map with Active Delivery Route - Keep visible */}
            <div className="bg-white rounded-3xl shadow-medium p-6 mb-6">
              <h3 className="text-h3 font-semibold mb-4">Delivery Route</h3>
              {activeDelivery && (
                <DeliveryMap
                  deliveries={[activeDelivery]}
                  userLocation={geoLocation}
                  selectedDelivery={activeDelivery}
                  partnerLocation={geoLocation}
                  height="400px"
                />
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-medium p-6 mb-6">
              <h3 className="text-h3 font-semibold mb-4">Delivery Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Item:</p>
                  <p className="text-lg font-bold">{activeDelivery.item_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Amount:</p>
                    <p className="text-lg font-bold text-primary-600">
                      Rs. {activeDelivery.delivery_amount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Distance:</p>
                    <p className="text-lg">{activeDelivery.distance} km</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pickup Location:</p>
                  <p className="text-sm break-words">{activeDelivery.source_address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Location:</p>
                  <p className="text-sm break-words">
                    {activeDelivery.destination_address}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sender Contact:</p>
                  <p className="text-lg">{activeDelivery.phone}</p>
                </div>
              </div>
            </div>

            {/* Item Verification (only if accepted and no item photo yet) */}
            {activeDelivery.status === 'accepted' && !activeDelivery.item_photo_url && (
              <div className="bg-white rounded-3xl shadow-medium p-6 mb-6">
                <h3 className="text-h3 font-semibold mb-4">Step 1: Verify Item at Pickup</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Reach the pickup location and take a clear photo of the item.
                </p>
                <ImageUpload
                  onImageCapture={handleItemVerification}
                  loading={uploading}
                  buttonText="Take Item Photo"
                />
                {uploading && (
                  <p className="text-sm text-primary-600 mt-2">Uploading photo, please wait...</p>
                )}
              </div>
            )}

            {/* Waiting for sender verification */}
            {activeDelivery.status === 'accepted' && activeDelivery.item_photo_url && (
              <div className="bg-primary-light p-4 mb-6 rounded-2xl text-center">
                <p className="font-medium">
                  Item photo uploaded. Waiting for sender to verify the item...
                </p>
              </div>
            )}

            {/* Deliver Item (only if verified and no delivery proof yet) */}
            {activeDelivery.status === 'picked_up' && !activeDelivery.delivery_photo_url && (
              <div className="bg-white rounded-3xl shadow-medium p-6 mb-6">
                <h3 className="text-h3 font-semibold mb-4">Step 2: Deliver Item</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Deliver the item to the destination and take a photo as proof of delivery.
                </p>
                <ImageUpload
                  onImageCapture={handleMarkDelivered}
                  loading={uploading}
                  buttonText="Take Delivery Photo"
                />
                {uploading && (
                  <p className="text-sm text-primary-600 mt-2">Uploading photo, please wait...</p>
                )}
              </div>
            )}

            {/* Waiting for sender confirmation */}
            {activeDelivery.status === 'delivered' && (
              <div className="bg-primary-light p-4 mb-6 rounded-2xl text-center">
                <p className="font-medium">
                  Delivery proof uploaded. Waiting for sender to confirm delivery...
                </p>
              </div>
            )}

            {/* Chat Interface */}
            <div className="bg-white rounded-3xl shadow-medium p-6 mb-6">
              <h3 className="text-h3 font-semibold mb-4">Chat with Sender</h3>
              <ChatInterface deliveryId={activeDelivery.id} />
            </div>

            {/* Cancel Button */}
            {activeDelivery.status !== 'delivered' && activeDelivery.status !== 'completed' && (
              <div className="text-center mb-6">
                <button
                  onClick={handleCancelDelivery}
                  className="btn-outline px-4 sm:px-8 py-3 text-red-600 border-red-600 hover:bg-red-50 w-full sm:w-auto text-sm sm:text-base rounded-lg font-medium"
                >
                  {activeDelivery.status === 'picked_up' || activeDelivery.status === 'in_transit'
                    ? 'Emergency Cancel'
                    : 'Cancel Delivery'}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-h1 font-bold mb-4">Deliver and Get Rewards</h1>
              <p className="text-lg text-gray-700">
                Click the Find Delivery and Start Getting rewards
              </p>
            </div>

            {/* Geolocation Error */}
            {geoError && (
              <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <p className="font-medium">Location Error:</p>
                <p>{geoError}</p>
                <p className="text-sm mt-2">
                  Please enable location services to find nearby deliveries.
                </p>
              </div>
            )}

            {/* Current Location Info */}
            {geoLocation && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">
                  Location tracking active - Finding deliveries near you
                </p>
              </div>
            )}

            {/* Find Delivery Button */}
            <div className="mb-6 text-center">
              <button
                onClick={handleFindDeliveries}
                disabled={!geoLocation || loading || finding}
                className="btn-primary px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {finding ? 'Finding Deliveries...' : 'Find the Delivery'}
              </button>
            </div>

            {/* Delivery Count */}
            {deliveries.length > 0 && (
              <div className="mb-4 text-center">
                <p className="text-gray-700">
                  Found{' '}
                  <span className="font-bold text-primary-600">{deliveries.length}</span>{' '}
                  deliveries nearby
                </p>
              </div>
            )}

            {/* Map */}
            <div className="bg-white rounded-3xl shadow-medium p-6 mb-6">
              <DeliveryMap
                deliveries={deliveries}
                userLocation={geoLocation}
                onDeliverySelect={setSelectedDelivery}
                selectedDelivery={selectedDelivery}
                height="600px"
              />
            </div>

            {/* Selected Delivery Details */}
            {selectedDelivery && (
              <div className="bg-white rounded-3xl shadow-medium p-6 fade-in">
                <h2 className="text-h2 font-semibold mb-4">Delivery Details</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name
                    </label>
                    <p className="text-lg font-semibold">{selectedDelivery.item_name}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Distance
                      </label>
                      <p className="text-lg">{selectedDelivery.distance} km</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment
                      </label>
                      <p className="text-lg font-semibold text-primary-600">
                        Rs. {selectedDelivery.delivery_amount}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Limit
                    </label>
                    <p className="text-lg">{selectedDelivery.time_limit} minutes</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Location
                    </label>
                    <p className="text-sm text-gray-600">
                      {selectedDelivery.source_address}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Location
                    </label>
                    <p className="text-sm text-gray-600">
                      {selectedDelivery.destination_address}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sender Contact
                    </label>
                    <p className="text-lg">{selectedDelivery.phone}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => handleAcceptDelivery(selectedDelivery)}
                      disabled={acceptingId === selectedDelivery.id}
                      className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {acceptingId === selectedDelivery.id ? 'Accepting...' : 'Accept Delivery'}
                    </button>
                    <button
                      onClick={() => setSelectedDelivery(null)}
                      className="flex-1 btn-outline py-3"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* No Deliveries Message */}
            {!loading && deliveries.length === 0 && geoLocation && (
              <div className="bg-white rounded-3xl shadow-medium p-8 text-center">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-h3 font-semibold mb-2">No deliveries found nearby</h3>
                <p className="text-gray-600 mb-4">
                  There are no active delivery requests in your area right now.
                </p>
                <button onClick={fetchNearbyDeliveries} className="btn-secondary px-6 py-2">
                  Refresh
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DeliveryPartner;

