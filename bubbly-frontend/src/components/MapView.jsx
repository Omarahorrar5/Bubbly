import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import BubbleMarker from './BubbleMarker';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Rabat, Morocco coordinates
const RABAT_CENTER = [34.0209, -6.8416];
const DEFAULT_ZOOM = 13;

// Create a pin icon for location selection
const pinIcon = L.divIcon({
    className: 'selected-location-marker',
    html: `<div style="width: 30px; height: 30px; background: #e63946; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
});

export default function MapView({ bubbles, onBubbleClick, onMapClick, selectingLocation, selectedLocation }) {
    return (
        <MapContainer
            center={RABAT_CENTER}
            zoom={DEFAULT_ZOOM}
            className="map-container"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {bubbles?.map((bubble) => (
                <BubbleMarker
                    key={bubble.id}
                    bubble={bubble}
                    onClick={() => onBubbleClick?.(bubble)}
                />
            ))}

            {selectedLocation && (
                <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={pinIcon} />
            )}

            {selectingLocation && <LocationSelector onSelect={onMapClick} />}
        </MapContainer>
    );
}

function LocationSelector({ onSelect }) {
    useMapEvents({
        click: (e) => {
            onSelect?.({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
}
