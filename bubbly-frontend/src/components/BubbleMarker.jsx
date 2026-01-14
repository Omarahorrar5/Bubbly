import { Marker, Popup } from 'react-leaflet';
import { useRef, useEffect } from 'react';
import L from 'leaflet';
import './BubbleMarker.css';

// Create custom bubble icon
function createBubbleIcon(isOpen) {
    const color = isOpen ? '#e63946' : '#9ca3af';

    return L.divIcon({
        className: 'bubble-marker-icon',
        html: `
      <div class="bubble-marker ${isOpen ? 'open' : 'closed'}">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="3"/>
          <circle cx="12" cy="12" r="4" fill="rgba(255,255,255,0.4)"/>
        </svg>
      </div>
    `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
}

export default function BubbleMarker({ bubble, onClick }) {
    const position = [parseFloat(bubble.latitude), parseFloat(bubble.longitude)];
    const isOpen = bubble.status === 'open';
    const markerRef = useRef(null);
    const closeTimeoutRef = useRef(null);
    const popupRef = useRef(null);

    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    function handleMouseOver() {
        // Cancel any pending close
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        markerRef.current?.openPopup();
    }

    function handleMouseOut() {
        // Delay close to allow moving to popup
        closeTimeoutRef.current = setTimeout(() => {
            markerRef.current?.closePopup();
        }, 100);
    }

    function handlePopupMouseEnter() {
        // Cancel close when entering popup
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    }

    function handlePopupMouseLeave() {
        // Close popup when leaving it
        markerRef.current?.closePopup();
    }

    return (
        <Marker
            position={position}
            icon={createBubbleIcon(isOpen)}
            ref={markerRef}
            eventHandlers={{
                click: onClick,
                mouseover: handleMouseOver,
                mouseout: handleMouseOut,
            }}
        >
            <Popup ref={popupRef}>
                <div
                    className="bubble-popup"
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                >
                    <h3 className="bubble-popup-title">{bubble.title}</h3>
                    <p className="bubble-popup-owner">by {bubble.owner_name}</p>
                    <div className="bubble-popup-meta">
                        <span className={`bubble-status ${isOpen ? 'open' : 'closed'}`}>
                            {isOpen ? 'Open' : 'Closed'}
                        </span>
                        <span className="bubble-members">
                            {bubble.member_count || 1} member{(bubble.member_count || 1) !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {bubble.interests?.[0] && (
                        <div className="bubble-popup-interests">
                            {bubble.interests.filter(Boolean).slice(0, 3).map((interest, i) => (
                                <span key={i} className="interest-tag">{interest}</span>
                            ))}
                        </div>
                    )}
                    <button className="popup-view-btn" onClick={onClick}>
                        View Details
                    </button>
                </div>
            </Popup>
        </Marker>
    );
}
