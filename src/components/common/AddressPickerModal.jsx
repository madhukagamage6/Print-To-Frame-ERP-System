import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Check, Globe } from 'lucide-react';
import { loadGoogleMapsScript, geocodeAddress } from '../../services/googleMapsService';
import { toast } from '../../utils/toast';

export default function AddressPickerModal({ isOpen, onClose, onSelect, initialAddress = '' }) {
  const [addressInput, setAddressInput] = useState(initialAddress);
  const [selectedLocation, setSelectedLocation] = useState({
    address: initialAddress || 'Colombo, Sri Lanka',
    lat: 6.9271,
    lng: 79.8612
  });
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setAddressInput(initialAddress);
      // Initialize map if DOM is ready
      initMap();
    }
  }, [isOpen, initialAddress]);

  const initMap = async () => {
    try {
      const maps = await loadGoogleMapsScript();
      if (!maps || !mapRef.current) return;

      const initialPos = { lat: 6.9271, lng: 79.8612 }; // Colombo default

      const map = new maps.Map(mapRef.current, {
        center: initialPos,
        zoom: 13,
        mapId: 'PRINT_TO_FRAME_ERP_MAP',
        disableDefaultUI: false,
      });

      mapInstanceRef.current = map;

      const marker = new maps.Marker({
        position: initialPos,
        map,
        draggable: true,
        title: 'Selected Delivery Location'
      });

      markerRef.current = marker;

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        const lat = pos.lat();
        const lng = pos.lng();
        reverseGeocode(lat, lng);
      });

      map.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        marker.setPosition({ lat, lng });
        reverseGeocode(lat, lng);
      });

    } catch (err) {
      console.warn('Map initialization error:', err);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const maps = window.google?.maps;
      if (maps && maps.Geocoder) {
        const geocoder = new maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const addr = results[0].formatted_address;
            setAddressInput(addr);
            setSelectedLocation({ address: addr, lat, lng });
          } else {
            const addr = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
            setAddressInput(addr);
            setSelectedLocation({ address: addr, lat, lng });
          }
        });
      } else {
        const addr = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        setAddressInput(addr);
        setSelectedLocation({ address: addr, lat, lng });
      }
    } catch {
      setSelectedLocation({ address: addressInput, lat, lng });
    }
  };

  const handleSearch = async () => {
    if (!addressInput.trim()) return;
    setIsSearching(true);
    try {
      const result = await geocodeAddress(addressInput);
      setSelectedLocation(result);
      setAddressInput(result.formattedAddress);

      if (mapInstanceRef.current && markerRef.current && window.google?.maps) {
        const pos = { lat: result.lat, lng: result.lng };
        mapInstanceRef.current.setCenter(pos);
        markerRef.current.setPosition(pos);
      }
      toast.success('Location found on map');
    } catch (err) {
      toast.error('Could not locate address.');
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center space-x-2">
            <MapPin className="text-primary" size={22} />
            <h3 className="text-lg font-bold text-on-surface">Select Location on Google Maps</h3>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-surface-container-low border-b border-outline-variant flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-on-surface-variant" size={18} />
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter delivery address, street, or city in Sri Lanka..."
              className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-5 py-2 bg-primary text-on-primary font-bold text-sm rounded-xl hover:opacity-90 transition-opacity flex items-center space-x-2"
          >
            <span>{isSearching ? 'Locating...' : 'Search'}</span>
          </button>
        </div>

        {/* Map Container */}
        <div className="relative w-full h-80 bg-surface-container">
          <div ref={mapRef} className="w-full h-full" />
          {/* Fallback indicator if maps script is slow/simulated */}
          <div className="absolute bottom-3 left-3 bg-surface/90 backdrop-blur border border-outline-variant px-3 py-1.5 rounded-lg text-xs text-on-surface-variant flex items-center space-x-1.5 shadow-lg pointer-events-none">
            <Globe size={14} className="text-primary" />
            <span>Click map or drag marker to pinpoint precise delivery spot</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="text-xs text-on-surface-variant truncate max-w-md">
            <span className="font-bold text-on-surface">Selected:</span> {selectedLocation.address}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSelect(selectedLocation);
                onClose();
              }}
              className="px-5 py-2 bg-primary text-on-primary font-bold text-sm rounded-xl hover:opacity-90 flex items-center space-x-2"
            >
              <Check size={16} />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
