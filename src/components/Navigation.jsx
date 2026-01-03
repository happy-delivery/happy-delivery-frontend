import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-background-light sticky top-0 z-[100] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center" onClick={handleNavClick}>
            <span className="text-xl font-bold text-dark">HAPPY DELIVERY</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/rewards"
              className="text-dark hover:text-gray-700 font-normal text-sm transition-colors"
            >
              Rewards
            </Link>
            <Link
              to="/profile"
              className="text-dark hover:text-gray-700 font-normal text-sm transition-colors"
            >
              Profile
            </Link>
            <Link
              to="/delivery-partner"
              className="text-dark hover:text-gray-700 font-normal text-sm transition-colors"
            >
              Ready
            </Link>
            <button
              onClick={() => {
                if (window.location.pathname === '/') {
                  scrollToSection('find-partner-section');
                } else {
                  navigate('/');
                  setTimeout(() => scrollToSection('find-partner-section'), 100);
                }
              }}
              className="text-dark hover:text-gray-700 font-normal text-sm transition-colors"
            >
              Find Partner
            </button>

            {!user && (
              <Link
                to="/get-started"
                className="bg-dark text-white px-4 py-2 font-normal text-sm hover:bg-gray-800 transition-colors"
              >
                Get started +
              </Link>
            )}

            {user && (
              <button
                onClick={handleLogout}
                className="text-dark hover:text-gray-700 font-normal text-sm transition-colors"
              >
                Logout
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-3 space-y-3">
            <Link
              to="/rewards"
              className="block text-dark hover:text-gray-700 font-normal py-2"
              onClick={handleNavClick}
            >
              Rewards
            </Link>
            <Link
              to="/profile"
              className="block text-dark hover:text-gray-700 font-normal py-2"
              onClick={handleNavClick}
            >
              Profile
            </Link>
            <Link
              to="/delivery-partner"
              className="block text-dark hover:text-gray-700 font-normal py-2"
              onClick={handleNavClick}
            >
              Ready
            </Link>
            <button
              onClick={() => {
                if (window.location.pathname === '/') {
                  scrollToSection('find-partner-section');
                } else {
                  navigate('/');
                  setTimeout(() => scrollToSection('find-partner-section'), 100);
                }
              }}
              className="block text-left text-dark hover:text-gray-700 font-normal py-2 w-full"
            >
              Find Partner
            </button>
            {!user && (
              <Link
                to="/get-started"
                className="block text-dark hover:text-gray-700 font-normal py-2"
                onClick={handleNavClick}
              >
                Get started
              </Link>
            )}
            {user && (
              <button
                onClick={handleLogout}
                className="block text-left text-dark hover:text-gray-700 font-normal py-2 w-full"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;

