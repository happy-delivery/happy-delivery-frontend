import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, db } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calculateDistance } from '../utils/geocoding';
import MapPicker from './MapPicker';
import useGeolocation from '../hooks/useGeolocation';

const DeliveryRequestForm = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { location: userLocation } = useGeolocation(false);

  const [formData, setFormData] = useState({
    itemName: '',
    phone: userData?.phone || '',
    deliveryAmount: '',
    timeLimit: '',
  });

  const [sourceLocation, setSourceLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    if (!formData.deliveryAmount) {
      newErrors.deliveryAmount = 'Delivery amount is required';
    } else if (parseFloat(formData.deliveryAmount) <= 0) {
      newErrors.deliveryAmount = 'Amount must be greater than 0';
    }

    if (!formData.timeLimit) {
      newErrors.timeLimit = 'Time limit is required';
    }

    if (!sourceLocation) {
      newErrors.source = 'Please select source location on map';
    }

    if (!destinationLocation) {
      newErrors.destination = 'Please select destination location on map';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Validate locations
      if (!sourceLocation || !sourceLocation.lat || !sourceLocation.lng) {
        throw new Error('Source location is invalid');
      }
      if (!destinationLocation || !destinationLocation.lat || !destinationLocation.lng) {
        throw new Error('Destination location is invalid');
      }
      
      // Calculate distance
      const distance = calculateDistance(
        sourceLocation.lat,
        sourceLocation.lng,
        destinationLocation.lat,
        destinationLocation.lng
      );

      // Ensure user is authenticated
      if (!user || !user.id) {
        throw new Error('Not authenticated. Please login again.');
      }

      // Get current session to ensure token is fresh
      let { data: { session } } = await supabase.auth.getSession();
      
      // If no session, try to refresh
      if (!session || !session.user) {
        console.warn('No session found, attempting to refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          throw new Error('Session expired. Please login again.');
        }
        session = refreshedSession;
      }

      // Double-check we have a valid user ID
      const userId = session.user.id || user.id;
      if (!userId) {
        throw new Error('Unable to get user ID. Please login again.');
      }

      // Ensure user profile exists in users table (required for foreign key)
      let userProfile = userData;
      if (!userProfile) {
        try {
          userProfile = await db.users.get(userId);
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      }
      
      // If user profile doesn't exist, create it
      if (!userProfile) {
        console.warn('User profile not found, creating it...');
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            // Try to create user profile - if it fails due to RLS, that's okay, the trigger should handle it
            try {
              userProfile = await db.users.create({
                id: userId,
                email: authUser.email || user.email || '',
                full_name: authUser.user_metadata?.full_name || user.user_metadata?.full_name || 'User',
                phone: authUser.user_metadata?.phone || user.user_metadata?.phone || null,
                reward_points: 0,
                total_deliveries: 0,
                total_requests: 0,
                rating: 0,
              });
              console.log('User profile created successfully');
            } catch (createErr) {
              // If creation fails, wait a bit and retry fetching (trigger might have created it)
              console.warn('Profile creation failed, waiting for trigger...', createErr);
              await new Promise(resolve => setTimeout(resolve, 1000));
              try {
                userProfile = await db.users.get(userId);
                if (userProfile) {
                  console.log('User profile found after wait');
                } else {
                  throw new Error('User profile still not found after creation attempt');
                }
              } catch (retryErr) {
                console.error('Failed to fetch user profile after retry:', retryErr);
                throw new Error('User profile not found. Please try logging out and logging back in, or contact support.');
              }
            }
          } else {
            throw new Error('Unable to get auth user data');
          }
        } catch (createErr) {
          console.error('Failed to create user profile:', createErr);
          throw new Error('User profile not found. Please try logging out and logging back in.');
        }
      }

      // Create delivery request
      const deliveryData = {
        sender_id: userId, // Use session user ID to ensure it matches auth.uid()
        delivery_partner_id: null,
        item_name: formData.itemName,
        phone: formData.phone,
        delivery_amount: parseFloat(formData.deliveryAmount),
        time_limit: parseInt(formData.timeLimit) || 60,
        source_lat: sourceLocation.lat,
        source_lng: sourceLocation.lng,
        source_address: sourceLocation.address,
        destination_lat: destinationLocation.lat,
        destination_lng: destinationLocation.lng,
        destination_address: destinationLocation.address,
        distance: distance,
        status: 'pending',
        item_photo_url: null,
        delivery_photo_url: null,
        item_verified: false,
      };

      const delivery = await db.deliveries.create(deliveryData);
      
      // Navigate to sender page with the delivery ID
      navigate(`/sender?deliveryId=${delivery.id}`);
    } catch (error) {
      console.error('Error creating delivery request:', error);
      setErrors({ submit: 'Failed to create delivery request. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-cream-light shadow-sm p-6 md:p-8 border border-gray-100">
      <h2 className="text-h2 font-semibold mb-6">Find Delivery-Partner</h2>

      {errors.submit && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Form Fields */}
          <div className="space-y-4">
            {/* Item Name */}
            <div>
              <label htmlFor="itemName" className="block text-xs font-normal mb-2 text-gray-600">
                Item Name
              </label>
              <input
                type="text"
                id="itemName"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                placeholder="Enter name"
                className={`input-field ${errors.itemName ? 'border-red-500' : ''}`}
              />
              {errors.itemName && (
                <p className="mt-1 text-sm text-red-600">{errors.itemName}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-xs font-normal mb-2 text-gray-600">
                Phone no
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter Phone no"
                className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Delivery Amount */}
            <div>
              <label htmlFor="deliveryAmount" className="block text-xs font-normal mb-2 text-gray-600">
                Delivery Amount
              </label>
              <input
                type="number"
                id="deliveryAmount"
                name="deliveryAmount"
                value={formData.deliveryAmount}
                onChange={handleChange}
                placeholder="Enter the amount > 30"
                min="0"
                step="0.01"
                className={`input-field ${errors.deliveryAmount ? 'border-red-500' : ''}`}
              />
              {errors.deliveryAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.deliveryAmount}</p>
              )}
            </div>

            {/* Time Limit */}
            <div>
              <label htmlFor="timeLimit" className="block text-xs font-normal mb-2 text-gray-600">
                Time
              </label>
              <input
                type="text"
                id="timeLimit"
                name="timeLimit"
                value={formData.timeLimit}
                onChange={handleChange}
                placeholder="In how much time do you want it get deliver"
                className={`input-field ${errors.timeLimit ? 'border-red-500' : ''}`}
              />
              {errors.timeLimit && (
                <p className="mt-1 text-sm text-red-600">{errors.timeLimit}</p>
              )}
            </div>
          </div>

          {/* Right Column - Map */}
          <div>
            <label className="block text-xs font-normal mb-2 text-gray-600">
              Select Source and Destination
            </label>
            <MapPicker
              sourceLocation={sourceLocation}
              destinationLocation={destinationLocation}
              onSourceSelect={setSourceLocation}
              onDestinationSelect={setDestinationLocation}
              center={userLocation}
              height="450px"
            />
            {(errors.source || errors.destination) && (
              <div className="mt-2 space-y-1">
                {errors.source && <p className="text-sm text-red-600">{errors.source}</p>}
                {errors.destination && <p className="text-sm text-red-600">{errors.destination}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Request...' : 'Find Delivery-Partner'}
        </button>
      </form>
    </div>
  );
};

export default DeliveryRequestForm;

