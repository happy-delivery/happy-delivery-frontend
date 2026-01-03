import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker for deliveries
const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom marker for user location
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to update map center
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng && typeof center.lat === 'number' && typeof center.lng === 'number') {
      map.setView([center.lat, center.lng], 13);
    }
  }, [center, map]);
  return null;
};

const DeliveryMap = ({ 
  deliveries = [], 
  userLocation,
  onDeliverySelect,
  selectedDelivery,
  partnerLocation,
  height = '500px',
}) => {
  // Helper to normalize delivery data (handle both snake_case from Supabase and camelCase)
  const normalizeDelivery = (delivery) => {
    if (!delivery) return null;
    
    // If already normalized (has sourceLocation), return as is
    if (delivery.sourceLocation && delivery.sourceLocation.lat) return delivery;
    
    // Transform from Supabase format (snake_case) to expected format
    const sourceLat = delivery.source_lat ?? delivery.sourceLocation?.lat;
    const sourceLng = delivery.source_lng ?? delivery.sourceLocation?.lng;
    const destLat = delivery.destination_lat ?? delivery.destinationLocation?.lat;
    const destLng = delivery.destination_lng ?? delivery.destinationLocation?.lng;
    
    // Only return normalized if we have valid coordinates
    if (!sourceLat || !sourceLng) return null;
    
    return {
      ...delivery,
      sourceLocation: {
        lat: sourceLat,
        lng: sourceLng,
        address: delivery.source_address || delivery.sourceLocation?.address || '',
      },
      destinationLocation: {
        lat: destLat || sourceLat,
        lng: destLng || sourceLng,
        address: delivery.destination_address || delivery.destinationLocation?.address || '',
      },
      itemName: delivery.item_name || delivery.itemName || 'Item',
      deliveryAmount: delivery.delivery_amount || delivery.deliveryAmount,
      timeLimit: delivery.time_limit || delivery.timeLimit,
    };
  };

  // Default center coordinates
  const defaultCenter = { 
    lat: parseFloat(process.env.REACT_APP_MAP_DEFAULT_LAT) || 28.6139, 
    lng: parseFloat(process.env.REACT_APP_MAP_DEFAULT_LNG) || 77.2090 
  };

  const [mapCenter, setMapCenter] = useState(
    userLocation || partnerLocation || defaultCenter
  );

  useEffect(() => {
    if (partnerLocation && partnerLocation.lat && partnerLocation.lng) {
      setMapCenter(partnerLocation);
    } else if (userLocation && userLocation.lat && userLocation.lng) {
      setMapCenter(userLocation);
    } else {
      setMapCenter(defaultCenter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, partnerLocation]);

  // Ensure mapCenter is valid
  const validCenter = mapCenter && mapCenter.lat && mapCenter.lng 
    ? mapCenter 
    : defaultCenter;

  // Normalize selected delivery
  const normalizedSelectedDelivery = normalizeDelivery(selectedDelivery);

  return (
    <div style={{ height, borderRadius: '1rem', overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        center={[validCenter.lat, validCenter.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={validCenter} />

        {/* User's current location */}
        {userLocation && userLocation.lat && userLocation.lng && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
          >
            <Popup>
              <div>
                <p className="font-bold">Your Location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Partner's location during delivery */}
        {partnerLocation && partnerLocation.lat && partnerLocation.lng && 
         (!userLocation || userLocation.lat !== partnerLocation.lat || userLocation.lng !== partnerLocation.lng) && (
          <Marker 
            position={[partnerLocation.lat, partnerLocation.lng]}
            icon={userIcon}
          >
            <Popup>
              <div>
                <p className="font-bold">Delivery Partner</p>
                <p className="text-xs">Current location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Delivery markers */}
        {deliveries.map((delivery) => {
          const normalized = normalizeDelivery(delivery);
          if (!normalized || !normalized.sourceLocation || !normalized.sourceLocation.lat) {
            return null;
          }
          
          return (
            <Marker
              key={delivery.id || normalized.id}
              position={[normalized.sourceLocation.lat, normalized.sourceLocation.lng]}
              icon={deliveryIcon}
              eventHandlers={{
                click: () => onDeliverySelect && onDeliverySelect(normalized),
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-bold mb-2">{normalized.itemName || 'Item'}</h3>
                  <div className="space-y-1 text-sm">
                    {normalized.distance && (
                      <p><span className="font-medium">Distance:</span> {normalized.distance} km</p>
                    )}
                    {normalized.deliveryAmount && (
                      <p><span className="font-medium">Amount:</span> Rs. {normalized.deliveryAmount}</p>
                    )}
                    {normalized.timeLimit && (
                      <p><span className="font-medium">Time:</span> {normalized.timeLimit}</p>
                    )}
                    {normalized.sourceLocation?.address && (
                      <p className="text-xs text-gray-600 mt-2">
                        From: {normalized.sourceLocation.address}
                      </p>
                    )}
                    {normalized.destinationLocation?.address && (
                      <p className="text-xs text-gray-600">
                        To: {normalized.destinationLocation.address}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onDeliverySelect && onDeliverySelect(normalized)}
                    className="w-full mt-3 bg-primary-500 text-dark px-4 py-2 rounded-lg font-medium hover:bg-primary-600 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Selected delivery route visualization */}
        {normalizedSelectedDelivery && 
         normalizedSelectedDelivery.sourceLocation && 
         normalizedSelectedDelivery.sourceLocation.lat && 
         normalizedSelectedDelivery.sourceLocation.lng &&
         normalizedSelectedDelivery.destinationLocation && 
         normalizedSelectedDelivery.destinationLocation.lat && 
         normalizedSelectedDelivery.destinationLocation.lng && (
          <>
            <Marker
              position={[normalizedSelectedDelivery.sourceLocation.lat, normalizedSelectedDelivery.sourceLocation.lng]}
              icon={new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              })}
            >
              <Popup>
                <div>
                  <p className="font-bold">Pickup Location</p>
                  {normalizedSelectedDelivery.sourceLocation.address && (
                    <p className="text-xs">{normalizedSelectedDelivery.sourceLocation.address}</p>
                  )}
                </div>
              </Popup>
            </Marker>
            <Marker
              position={[normalizedSelectedDelivery.destinationLocation.lat, normalizedSelectedDelivery.destinationLocation.lng]}
              icon={new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              })}
            >
              <Popup>
                <div>
                  <p className="font-bold">Delivery Location</p>
                  {normalizedSelectedDelivery.destinationLocation.address && (
                    <p className="text-xs">{normalizedSelectedDelivery.destinationLocation.address}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;

