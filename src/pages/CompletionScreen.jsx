import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';

const CompletionScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deliveryId = searchParams.get('deliveryId');
  const { user } = useAuth();

  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!deliveryId) {
      navigate('/');
      return;
    }

    const fetchDelivery = async () => {
      try {
        const deliveryData = await db.deliveries.get(deliveryId);
        setDelivery(deliveryData);

        // Check if user is the sender
        if (deliveryData.sender_id !== user?.id) {
          alert('Unauthorized access');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching delivery:', error);
        alert('Failed to load delivery');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchDelivery();
  }, [deliveryId, user, navigate]);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      // Only update rating (feedback column doesn't exist in schema)
      await db.deliveries.update(deliveryId, {
        rating,
      });
      
      // Store feedback in a separate way if needed (could add to schema later)
      // For now, just log it or store in a different table
      if (feedback.trim()) {
        console.log('Feedback (not stored):', feedback.trim());
      }

      // Update partner's rating (you could add more sophisticated logic here)
      alert('Thank you for your feedback!');
      navigate('/');
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating');
    } finally {
      setSubmitting(false);
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

  const calculateDuration = () => {
    if (!delivery.created_at || !delivery.completed_at) return 'N/A';
    // Supabase uses ISO strings (created_at, completed_at)
    const start = new Date(delivery.created_at);
    const end = new Date(delivery.completed_at);
    const durationMs = end - start;
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-cream">
      <Navigation />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-h1 font-bold mb-2">Delivery Completed!</h1>
          <p className="text-lg text-gray-700">
            Your item has been delivered successfully
          </p>
        </div>

        {/* Delivery Summary */}
        <div className="bg-white rounded-3xl shadow-medium p-6 mb-6">
          <h2 className="text-h2 font-semibold mb-4">Delivery Summary</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700">Item:</span>
              <span className="font-semibold">{delivery.item_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Distance:</span>
              <span className="font-semibold">{delivery.distance} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Time Taken:</span>
              <span className="font-semibold">{calculateDuration()}</span>
            </div>
            {delivery.delivery_partner_id && (
              <div className="flex justify-between">
                <span className="text-gray-700">Delivery Partner ID:</span>
                <span className="font-semibold">{delivery.delivery_partner_id.substring(0, 8)}...</span>
              </div>
            )}
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Payment Amount:</span>
                <span className="text-2xl font-bold text-primary-600">
                  Rs. {delivery.delivery_amount}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Please settle the payment directly with the delivery partner
              </p>
            </div>
          </div>
        </div>

        {/* Rating Section */}
        {!delivery.rating && (
          <div className="bg-white rounded-3xl shadow-medium p-6 mb-6">
            <h2 className="text-h2 font-semibold mb-4">Rate Your Experience</h2>
            
            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <svg
                    className={`w-12 h-12 ${
                      star <= rating ? 'text-primary-500' : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Feedback */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Feedback (Optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
                className="input-field"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitRating}
              disabled={rating === 0 || submitting}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit & Complete'}
            </button>
          </div>
        )}

        {/* Already Rated */}
        {delivery.rating && (
          <div className="bg-white rounded-3xl shadow-medium p-6 mb-6">
            <h2 className="text-h2 font-semibold mb-4">Your Rating</h2>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-10 h-10 ${
                    star <= delivery.rating ? 'text-primary-500' : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            {delivery.feedback && (
              <p className="text-gray-700 text-center">{delivery.feedback}</p>
            )}
          </div>
        )}

        {/* Return Home Button */}
        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary px-8 py-3"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionScreen;

