import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bubblesAPI } from '../services/api';
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
    const [selectingLocation, setSelectingLocation] = useState(false);
    const [newBubbleLocation, setNewBubbleLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadBubbles();
    }, [filter]);

    async function loadBubbles() {
        setLoading(true);
        try {
            const status = filter === 'all' ? undefined : filter;
            const data = await bubblesAPI.getAll(status);
            setBubbles(data.bubbles || []);
        } catch (err) {
            console.error('Failed to load bubbles:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleBubbleClick(bubble) {
        try {
            const data = await bubblesAPI.getById(bubble.id);
            setSelectedBubble(data.bubble);
        } catch (err) {
            console.error('Failed to load bubble details:', err);
            setSelectedBubble(bubble);
        }
    }

    function handleCreateClick() {
        setSelectingLocation(true);
        setShowCreateModal(true);
    }

    function handleMapClick(location) {
        if (selectingLocation) {
            setNewBubbleLocation(location);
        }
    }

    async function handleCreateBubble(bubbleData) {
        await bubblesAPI.create(bubbleData);
        setShowCreateModal(false);
        setSelectingLocation(false);
        setNewBubbleLocation(null);
        loadBubbles();
    }

    function handleCloseCreateModal() {
        setShowCreateModal(false);
        setSelectingLocation(false);
        setNewBubbleLocation(null);
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
                    <div className="filter-tabs">
                        <button
                            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`filter-tab ${filter === 'open' ? 'active' : ''}`}
                            onClick={() => setFilter('open')}
                        >
                            Open
                        </button>
                        <button
                            className={`filter-tab ${filter === 'closed' ? 'active' : ''}`}
                            onClick={() => setFilter('closed')}
                        >
                            Closed
                        </button>
                    </div>
                </div>

                <div className="header-right">
                    {isAuthenticated ? (
                        <>
                            <button className="create-bubble-btn" onClick={handleCreateClick}>
                                + Create Bubble
                            </button>
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
                {selectingLocation && (
                    <div className="location-hint">
                        Click anywhere on the map to place your bubble
                    </div>
                )}

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
                            selectingLocation={selectingLocation}
                            selectedLocation={newBubbleLocation}
                        />
                    )}
                </div>

                <div className="bubble-count">
                    {bubbles.length} bubble{bubbles.length !== 1 ? 's' : ''} in Rabat
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
