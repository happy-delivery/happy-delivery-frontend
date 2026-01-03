import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reverseGeocode } from '../utils/geocoding';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icon for source (red)
const sourceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom marker icon for destination (blue)
const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to update map center ONLY on initial load
const MapUpdater = ({ center }) => {
  const map = useMap();
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (center && center.lat && center.lng && !hasInitialized) {
      map.setView([center.lat, center.lng], map.getZoom());
      setHasInitialized(true);
    }
  }, [center, map, hasInitialized]);
  
  return null;
};

// Component to handle map clicks
const MapClickHandler = ({ onLocationSelect, pickingSource }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const address = await reverseGeocode(lat, lng);
      onLocationSelect({ lat, lng, address: address?.address || `${lat}, ${lng}` });
    },
  });
  return null;
};

const MapPicker = ({ 
  sourceLocation, 
  destinationLocation, 
  onSourceSelect, 
  onDestinationSelect,
  pickingSource = true,
  center,
  zoom = 13,
  height = '400px',
}) => {
  const [pickingType, setPickingType] = useState(pickingSource ? 'source' : 'destination');
  const defaultCenter = { 
    lat: parseFloat(process.env.REACT_APP_MAP_DEFAULT_LAT) || 28.6139, 
    lng: parseFloat(process.env.REACT_APP_MAP_DEFAULT_LNG) || 77.2090 
  };
  
  const [mapCenter] = useState(
    (center && center.lat && center.lng) ? center :
    (sourceLocation && sourceLocation.lat && sourceLocation.lng) ? sourceLocation :
    defaultCenter
  );

  const handleLocationSelect = (location) => {
    if (pickingType === 'source') {
      onSourceSelect(location);
      setPickingType('destination');
    } else {
      onDestinationSelect(location);
    }
  };

  return (
    <div className="space-y-3">
      {/* Location Type Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPickingType('source')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            pickingType === 'source'
              ? 'bg-primary-500 text-dark'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Select Source
        </button>
        <button
          type="button"
          onClick={() => setPickingType('destination')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            pickingType === 'destination'
              ? 'bg-primary-500 text-dark'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Select Destination
        </button>
      </div>

      {/* Selected Locations Display */}
      <div className="text-sm space-y-2 overflow-hidden">
        {sourceLocation && sourceLocation.address && (
          <div className="p-2 bg-red-50 rounded border border-red-200">
            <p className="font-medium text-red-800 text-xs">Source:</p>
            <p className="text-red-700 text-xs break-words overflow-hidden">{sourceLocation.address}</p>
          </div>
        )}
        {destinationLocation && destinationLocation.address && (
          <div className="p-2 bg-blue-50 rounded border border-blue-200">
            <p className="font-medium text-blue-800 text-xs">Destination:</p>
            <p className="text-blue-700 text-xs break-words overflow-hidden">{destinationLocation.address}</p>
          </div>
        )}
      </div>

      {/* Map */}
      <div
        style={{ height, borderRadius: '1rem', overflow: 'hidden', position: 'relative' }}
      >
        <MapContainer
          center={[
            (mapCenter && mapCenter.lat) ? mapCenter.lat : defaultCenter.lat,
            (mapCenter && mapCenter.lng) ? mapCenter.lng : defaultCenter.lng
          ]}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapUpdater center={center} />
          
          <MapClickHandler 
            onLocationSelect={handleLocationSelect} 
            pickingSource={pickingType === 'source'}
          />

          {sourceLocation && sourceLocation.lat && sourceLocation.lng && (
            <Marker 
              position={[sourceLocation.lat, sourceLocation.lng]}
              icon={sourceIcon}
            >
              <Popup>
                <div>
                  <p className="font-bold">Source</p>
                  {sourceLocation.address && (
                    <p className="text-xs">{sourceLocation.address}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {destinationLocation && destinationLocation.lat && destinationLocation.lng && (
            <Marker 
              position={[destinationLocation.lat, destinationLocation.lng]}
              icon={destinationIcon}
            >
              <Popup>
                <div>
                  <p className="font-bold">Destination</p>
                  {destinationLocation.address && (
                    <p className="text-xs">{destinationLocation.address}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-gray-600 text-center">
        Click on the map to select {pickingType} location
      </p>
    </div>
  );
};

export default MapPicker;

