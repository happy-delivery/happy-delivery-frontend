import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, db } from '../utils/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen to authentication state changes
  useEffect(() => {
    let mounted = true;
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth initialization timeout, setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        
        clearTimeout(loadingTimeout);
        
        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setUserData(null);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          setUser(session.user);
          // Load user data with timeout protection
          Promise.race([
            loadUserData(session.user.id),
            new Promise((resolve) => setTimeout(resolve, 5000)) // 5 second max
          ]).finally(() => {
            if (mounted) {
              setLoading(false);
            }
          }).catch(() => {
            // Ignore errors, loading will be set to false in finally
            if (mounted) {
              setLoading(false);
            }
          });
        } else {
          setUser(null);
          setUserData(null);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!mounted) return;
        console.error('Error in getSession:', error);
        clearTimeout(loadingTimeout);
        setUser(null);
        setUserData(null);
        setLoading(false);
      });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      clearTimeout(loadingTimeout);
      
      if (session?.user) {
        setUser(session.user);
        // Load user data with timeout protection
        Promise.race([
          loadUserData(session.user.id),
          new Promise((resolve) => setTimeout(resolve, 5000)) // 5 second max
        ]).finally(() => {
          if (mounted) {
            setLoading(false);
          }
        }).catch(() => {
          // Ignore errors, loading will be set to false in finally
          if (mounted) {
            setLoading(false);
          }
        });
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Load user data from database
  const loadUserData = async (userId) => {
    try {
      // Set a shorter timeout for the database call (3 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      );
      
      const userData = await Promise.race([
        db.users.get(userId),
        timeoutPromise
      ]);
      
      if (userData) {
        setUserData(userData);
        return;
      }
    } catch (err) {
      // If timeout or error, try once more without timeout
      if (err.message === 'Database query timeout' || err.code) {
        try {
          const userData = await db.users.get(userId);
          if (userData) {
            setUserData(userData);
            return;
          }
        } catch (retryErr) {
          // Ignore retry errors
        }
      }
    }
    
    // If user profile doesn't exist, try to create it (non-blocking)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Check if user already exists before creating
        try {
          const existing = await db.users.get(userId);
          if (existing) {
            setUserData(existing);
            return;
          }
        } catch (checkErr) {
          // User doesn't exist, continue to create
        }
        
        try {
          const newProfile = await db.users.create({
            id: userId,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name || 'User',
            phone: authUser.user_metadata?.phone || null,
            reward_points: 0,
            total_deliveries: 0,
            total_requests: 0,
            rating: 0,
          });
          if (newProfile) {
            setUserData(newProfile);
          }
        } catch (createErr) {
          // Check if it's a duplicate key error (user already exists)
          if (createErr.code === '23505' || createErr.message?.includes('duplicate key')) {
            try {
              const existing = await db.users.get(userId);
              if (existing) {
                setUserData(existing);
              }
            } catch (fetchErr) {
              // Ignore fetch errors
            }
          }
          // Don't throw - profile creation is optional
        }
      }
    } catch (err) {
      // Ignore all errors - user profile creation is optional
      // The app should work even without userData
    }
  };

  // Sign up function
  const signup = async (email, password, fullName, phone) => {
    try {
      setError(null);
      setLoading(true);

      // Create user with email and password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // User profile is automatically created by database trigger
      // Wait and retry fetching the user profile (trigger may take a moment)
      let createdUser = null;
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          createdUser = await db.users.get(authData.user.id);
          break;
        } catch (err) {
          if (i === 4) {
            // Last attempt failed, create profile manually as fallback
            console.warn('Trigger did not create profile, creating manually');
            try {
              createdUser = await db.users.create({
                id: authData.user.id,
                email,
                full_name: fullName,
                phone,
                reward_points: 0,
                total_deliveries: 0,
                total_requests: 0,
                rating: 0,
              });
            } catch (createErr) {
              console.error('Failed to create user profile:', createErr);
              // Set basic data anyway
              createdUser = {
                id: authData.user.id,
                email,
                full_name: fullName,
                phone,
                reward_points: 0,
                total_deliveries: 0,
                total_requests: 0,
                rating: 0,
              };
            }
          }
        }
      }
      
      if (createdUser) {
        setUserData(createdUser);
      }
      setUser(authData.user);

      return { success: true };
    } catch (err) {
      console.error('Signup error:', err);
      const errorMessage = err.message || 'Failed to create account';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Handle email not confirmed error
        if (authError.message.includes('Email not confirmed') || authError.message.includes('email_not_confirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in. If you did not receive an email, please sign up again.');
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error('Failed to login');

      // Fetch user data from database
      await loadUserData(authData.user.id);
      setUser(authData.user);

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.message || 'Failed to login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) throw logoutError;

      setUser(null);
      setUserData(null);
      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Update user location
  const updateUserLocation = async (lat, lng) => {
    if (!user) return;

    try {
      await db.users.update(user.id, {
        current_location_lat: lat,
        current_location_lng: lng,
      });

      setUserData((prev) => ({
        ...prev,
        current_location_lat: lat,
        current_location_lng: lng,
      }));
    } catch (err) {
      console.error('Error updating location:', err);
    }
  };

  // Update user availability
  const updateUserAvailability = async (isAvailable) => {
    if (!user) return;

    try {
      await db.users.update(user.id, {
        is_available: isAvailable,
      });

      setUserData((prev) => ({
        ...prev,
        is_available: isAvailable,
      }));
    } catch (err) {
      console.error('Error updating availability:', err);
    }
  };

  const value = {
    user,
    userData,
    loading,
    error,
    signup,
    login,
    logout,
    updateUserLocation,
    updateUserAvailability,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
