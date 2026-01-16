import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bubblesAPI, recommendationsAPI } from '../services/api';
import MapView from '../components/MapView';
import BubblePanel from '../components/BubblePanel';
import CreateBubbleModal from '../components/CreateBubbleModal';
import './Home.css';

export default function Home() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [bubbles, setBubbles] = useState([]);
    const [selectedBubble, setSelectedBubble] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBubbleLocation, setNewBubbleLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterMode, setFilterMode] = useState('suggested');

    useEffect(() => {
        loadBubbles();
    }, [filterMode, isAuthenticated]);

    // Check for pending bubble creation after login
    useEffect(() => {
        if (isAuthenticated) {
            const pendingLocation = sessionStorage.getItem('pendingBubbleLocation');
            if (pendingLocation) {
                const location = JSON.parse(pendingLocation);
                setNewBubbleLocation(location);
                setShowCreateModal(true);
                sessionStorage.removeItem('pendingBubbleLocation');
            }
        }
    }, [isAuthenticated]);

    async function loadBubbles() {
        setLoading(true);
        try {
            let data;

            if (filterMode === 'suggested' && isAuthenticated) {
                // Use ML-based recommendations for authenticated users
                try {
                    data = await recommendationsAPI.getSuggested();
                } catch (recError) {
                    console.log('Recommendations unavailable, falling back to all open bubbles');
                    data = await bubblesAPI.getAll('open');
                }
            } else {
                // Load all open bubbles
                data = await bubblesAPI.getAll('open');
            }

            setBubbles(data.bubbles || []);
        } catch (err) {
            console.error('Failed to load bubbles:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleBubbleClick(bubble) {
        // Clear any selected location when clicking a bubble
        setNewBubbleLocation(null);
        try {
            const data = await bubblesAPI.getById(bubble.id);
            setSelectedBubble(data.bubble);
        } catch (err) {
            console.error('Failed to load bubble details:', err);
            setSelectedBubble(bubble);
        }
    }

    function handleMapClick(location) {
        // When clicking on the map, set the location for potential bubble creation
        setNewBubbleLocation(location);
        // Close any open bubble panel
        setSelectedBubble(null);
    }

    function handleAddBubbleClick() {
        // Redirect to login if not authenticated
        if (!isAuthenticated) {
            // Save location for after login
            if (newBubbleLocation) {
                sessionStorage.setItem('pendingBubbleLocation', JSON.stringify(newBubbleLocation));
            }
            navigate('/login');
            return;
        }
        // When clicking "Add Bubble" in the popup, open the modal
        setShowCreateModal(true);
    }

    async function handleCreateBubble(bubbleData) {
        await bubblesAPI.create(bubbleData);
        setShowCreateModal(false);
        setNewBubbleLocation(null);
        loadBubbles();
    }

    function handleCloseCreateModal() {
        setShowCreateModal(false);
        // Don't clear location so user can try again
    }

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    return (
        <div className="home-page">
            <header className="home-header">
                <div className="header-left">
                    <div className="logo-small">
                        <span className="logo-bubble-small"></span>
                        <h1>Bubbly</h1>
                    </div>
                </div>

                <div className="header-center">
                    <div className="filter-switch">
                        <button
                            className={`filter-option ${filterMode === 'suggested' ? 'active' : ''}`}
                            onClick={() => setFilterMode('suggested')}
                        >
                            Suggested
                        </button>
                        <button
                            className={`filter-option ${filterMode === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterMode('all')}
                        >
                            All
                        </button>
                    </div>
                </div>

                <div className="header-right">
                    {isAuthenticated ? (
                        <>
                            <div className="user-menu">
                                <div className="user-avatar">
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="user-dropdown">
                                    <span className="user-name">{user?.name}</span>
                                    <button onClick={() => navigate('/my-bubbles')} className="dropdown-item">
                                        My Bubbles
                                    </button>
                                    <button onClick={handleLogout} className="dropdown-item logout">
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <button className="login-link" onClick={() => navigate('/login')}>
                            Sign In
                        </button>
                    )}
                </div>
            </header>

            <main className="home-main">
                <div className="map-wrapper">
                    {loading ? (
                        <div className="map-loading">
                            <div className="loading-spinner"></div>
                            <p>Loading bubbles...</p>
                        </div>
                    ) : (
                        <MapView
                            bubbles={bubbles}
                            onBubbleClick={handleBubbleClick}
                            onMapClick={handleMapClick}
                            selectedLocation={newBubbleLocation}
                            onAddBubbleClick={handleAddBubbleClick}
                            isAuthenticated={isAuthenticated}
                        />
                    )}
                </div>


            </main>

            {selectedBubble && (
                <BubblePanel
                    bubble={selectedBubble}
                    onClose={() => setSelectedBubble(null)}
                    onUpdate={() => {
                        loadBubbles();
                        handleBubbleClick(selectedBubble);
                    }}
                />
            )}

            {showCreateModal && (
                <CreateBubbleModal
                    onClose={handleCloseCreateModal}
                    onCreate={handleCreateBubble}
                    selectedLocation={newBubbleLocation}
                />
            )}
        </div>
    );
}
