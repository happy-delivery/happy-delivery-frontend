import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import DeliveryRequestForm from '../components/DeliveryRequestForm';

const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const formSectionRef = useRef(null);
  const [activeDeliveries, setActiveDeliveries] = useState([]);

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch active deliveries for the user
  useEffect(() => {
    const fetchActiveDeliveries = async () => {
      if (!user) return;

      try {
        const deliveries = await db.deliveries.getActiveBySender(user.id);
        setActiveDeliveries(deliveries);
      } catch (error) {
        console.error('Error fetching active deliveries:', error);
      }
    };

    fetchActiveDeliveries();
    // Poll every 10 seconds
    const interval = setInterval(fetchActiveDeliveries, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-cream">
      <Navigation />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-display font-bold mb-4">Happy</h1>
          <h1 className="text-display font-bold mb-6">Delivery</h1>
          <p className="text-h3 text-dark-700 max-w-3xl mx-auto">
            Happy Delivery is for everybody, Find - Delivery - Get Rewards
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={() => navigate('/delivery-partner')}
            className="btn-primary px-8 py-4 text-lg"
          >
            Accept Delivery
          </button>
          <button
            onClick={scrollToForm}
            className="btn-primary px-8 py-4 text-lg"
          >
            Find Delivery-Partner
          </button>
        </div>

        {/* Active Deliveries Section */}
        {user && activeDeliveries.length > 0 && (
          <div className="mb-12 bg-primary p-6 shadow-lg">
            <h2 className="text-h2 font-bold mb-6 text-center">Your Active Deliveries</h2>
            <div className="space-y-4">
              {activeDeliveries.map((delivery) => (
                <div 
                  key={delivery.id}
                  className="flex items-center justify-between p-5 bg-white hover:shadow-md transition-all cursor-pointer border-l-4 border-button"
                  onClick={() => navigate(`/sender?deliveryId=${delivery.id}`)}
                >
                  <div className="flex-1">
                    <p className="font-bold text-xl mb-2">{delivery.item_name}</p>
                    <div className="flex gap-4 text-sm">
                      <p className="text-gray-700">
                        Status: <span className="font-semibold text-button capitalize">{delivery.status.replace(/_/g, ' ')}</span>
                      </p>
                      <p className="text-gray-700">
                        Amount: <span className="font-semibold text-button">Rs. {delivery.delivery_amount}</span>
                      </p>
                    </div>
                  </div>
                  <button className="btn-primary px-6 py-3 font-medium">
                    Track
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map Preview Section */}
        <div className="mb-12">
          <img 
            src="/map.png" 
            alt="View live deliveries in your area" 
            className="w-full h-auto"
            style={{ borderRadius: '15px' }}
          />
        </div>

        {/* Delivery Request Form Section */}
        <div id="find-partner-section" ref={formSectionRef} className="mb-12">
          {user ? (
            <DeliveryRequestForm />
          ) : (
            <div className="bg-white rounded-3xl shadow-medium p-8 text-center">
              <h2 className="text-h2 font-semibold mb-4">Ready to send a delivery?</h2>
              <p className="text-gray-600 mb-6">
                Please login or sign up to create a delivery request
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary px-8 py-3"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="btn-secondary px-8 py-3"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Feature 1 */}
          <div className="bg-white p-6 text-center border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-h3 font-semibold mb-2">Clarify drives action</h3>
            <p className="text-gray-600">
              We believe better decisions start with better data—measured, visible, and trusted.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-6 text-center border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-h3 font-semibold mb-2">Find, Connect and Get deliver</h3>
            <p className="text-gray-600">
              We just build the Connection the trust lies in the people
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-6 text-center border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
            <h3 className="text-h3 font-semibold mb-2">Rewards means Motivation</h3>
            <p className="text-gray-600">
              You give rewards to each and everybody the Rewards for their work.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-cream p-12 text-center border border-gray-200">
          <h2 className="text-h1 font-bold mb-4">
            Ready to operationalize your sustainability goals?
          </h2>
          <button
            onClick={() => user ? navigate('/delivery-partner') : navigate('/signup')}
            className="btn-primary px-8 py-4 text-lg"
          >
            Accept Delivery
          </button>
        </div>
      </div>

      {/* Footer with Brand */}
      <div className="bg-gradient-to-r from-primary-300 via-primary-400 to-primary-300 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-6xl md:text-8xl font-bold text-dark">HAPPY Delivery</h1>
        </div>
      </div>
    </div>
  );
};

export default Home;

