import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import DeliveryPartner from './pages/DeliveryPartner';
import Sender from './pages/Sender';
import CompletionScreen from './pages/CompletionScreen';
import Rewards from './pages/Rewards';
import Profile from './pages/Profile';
import './styles/globals.css';

// Placeholder components (to be created)
const GetStarted = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="max-w-2xl mx-auto px-4 text-center">
      <h1 className="text-h1 font-bold mb-6">Welcome to Happy Delivery</h1>
      <p className="text-lg text-gray-700 mb-8">
        Join our platform to send deliveries or earn by becoming a delivery partner!
      </p>
      <div className="flex gap-4 justify-center">
        <a href="/signup" className="btn-primary px-8 py-3">Sign Up</a>
        <a href="/login" className="btn-secondary px-8 py-3">Login</a>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/get-started" element={<GetStarted />} />

          {/* Home route - accessible to all, shows different content based on auth */}
          <Route path="/" element={<Home />} />
          
          {/* Protected Routes */}
          <Route
            path="/delivery-partner"
            element={
              <ProtectedRoute>
                <DeliveryPartner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sender"
            element={
              <ProtectedRoute>
                <Sender />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rewards"
            element={
              <ProtectedRoute>
                <Rewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/completion"
            element={
              <ProtectedRoute>
                <CompletionScreen />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

