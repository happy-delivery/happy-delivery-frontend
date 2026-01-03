import axios from 'axios';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Rate limiting: 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000;

const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
};

// Reverse geocoding: Convert coordinates to address
export const reverseGeocode = async (lat, lng) => {
  try {
    await waitForRateLimit();
    
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat,
        lon: lng,
        format: 'json',
        addressdetails: 1,
      },
    });

    if (response.data) {
      return {
        address: response.data.display_name,
        city: response.data.address.city || response.data.address.town || response.data.address.village,
        state: response.data.address.state,
        country: response.data.address.country,
        postcode: response.data.address.postcode,
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

// Forward geocoding: Convert address to coordinates
export const forwardGeocode = async (address) => {
  try {
    await waitForRateLimit();
    
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        addressdetails: 1,
        limit: 5,
      },
    });

    if (response.data && response.data.length > 0) {
      return response.data.map(item => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name,
        city: item.address.city || item.address.town || item.address.village,
        state: item.address.state,
        country: item.address.country,
      }));
    }
    return [];
  } catch (error) {
    console.error('Forward geocoding error:', error);
    return [];
  }
};

// Calculate distance between two points using Haversine formula (in km)
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const geocodingUtils = {
  reverseGeocode,
  forwardGeocode,
  calculateDistance,
};

export default geocodingUtils;

