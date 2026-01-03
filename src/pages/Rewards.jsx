import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';

const Rewards = () => {
  const { userData } = useAuth();
  const [rewards] = useState([
    {
      id: 1,
      name: 'Amazon giftcards',
      points: 100,
      imageGradient: 'from-blue-400 to-cyan-300',
    },
    {
      id: 2,
      name: 'xyz',
      points: 200,
      imageGradient: 'from-teal-400 to-yellow-300',
    },
    {
      id: 3,
      name: 'abc',
      points: 150,
      imageGradient: 'from-purple-400 to-yellow-300',
    },
    {
      id: 4,
      name: 'wrt',
      points: 300,
      imageGradient: 'from-cyan-300 to-teal-400',
    },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-cream">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-h1 font-bold mb-4">Rewards</h1>
          <div className="bg-white rounded-2xl shadow-medium p-6 inline-block">
            <p className="text-gray-700 mb-2">Your Reward Points</p>
            <p className="text-4xl font-bold text-primary-600">
              {userData?.reward_points || 0}
            </p>
          </div>
        </div>

        {/* How to Earn Points */}
        <div className="bg-white rounded-3xl shadow-medium p-6 mb-8">
          <h2 className="text-h2 font-semibold mb-4">How to Earn Points</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-cream rounded-lg">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Complete Deliveries</h3>
              <p className="text-sm text-gray-600">Earn 10 points for each successful delivery</p>
            </div>
            <div className="p-4 bg-cream rounded-lg">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">High Ratings</h3>
              <p className="text-sm text-gray-600">Bonus 5 points for 5-star ratings</p>
            </div>
            <div className="p-4 bg-cream rounded-lg">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Quick Delivery</h3>
              <p className="text-sm text-gray-600">Extra 3 points for beating time limit</p>
            </div>
          </div>
        </div>

        {/* Available Rewards */}
        <div>
          <h2 className="text-h2 font-semibold mb-6">Available Rewards</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-white rounded-2xl shadow-medium overflow-hidden hover:shadow-strong transition-shadow"
              >
                <div className={`h-48 bg-gradient-to-br ${reward.imageGradient}`} />
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{reward.name}</h3>
                  <p className="text-gray-600 mb-3">{reward.points} Points</p>
                  <button
                    disabled={!userData || userData.reward_points < reward.points}
                    className="w-full btn-primary py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!userData || userData.reward_points < reward.points
                      ? 'Insufficient Points'
                      : 'Redeem'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-primary-300 via-primary-400 to-primary-300 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-6xl md:text-8xl font-bold text-dark">HAPPY Delivery</h1>
        </div>
      </div>
    </div>
  );
};

export default Rewards;

