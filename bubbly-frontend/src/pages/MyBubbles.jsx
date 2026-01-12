import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bubblesAPI } from '../services/api';
import './MyBubbles.css';

export default function MyBubbles() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [bubbles, setBubbles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        loadMyBubbles();
    }, [isAuthenticated]);

    async function loadMyBubbles() {
        setLoading(true);
        setError('');
        try {
            const data = await bubblesAPI.getMyBubbles();
            setBubbles(data.bubbles || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleLeave(bubbleId) {
        if (!confirm('Are you sure you want to leave this bubble?')) return;
        try {
            await bubblesAPI.leave(bubbleId);
            loadMyBubbles();
        } catch (err) {
            alert(err.message);
        }
    }

    async function handleClose(bubbleId) {
        if (!confirm('Are you sure you want to close this bubble?')) return;
        try {
            await bubblesAPI.close(bubbleId);
            loadMyBubbles();
        } catch (err) {
            alert(err.message);
        }
    }

    return (
        <div className="my-bubbles-page">
            <header className="my-bubbles-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    ← Back to Map
                </button>
                <h1>My Bubbles</h1>
                <div className="header-spacer"></div>
            </header>

            <main className="my-bubbles-main">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading your bubbles...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <p>{error}</p>
                        <button onClick={loadMyBubbles}>Try Again</button>
                    </div>
                ) : bubbles.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🫧</div>
                        <h2>No bubbles yet</h2>
                        <p>Join or create a bubble to see it here</p>
                        <button onClick={() => navigate('/')}>Explore Bubbles</button>
                    </div>
                ) : (
                    <div className="bubbles-grid">
                        {bubbles.map(bubble => (
                            <div key={bubble.id} className="bubble-card">
                                <div className="card-header">
                                    <span className={`status-dot ${bubble.status}`}></span>
                                    <span className="bubble-status-text">{bubble.status}</span>
                                </div>
                                <h3 className="bubble-title">{bubble.title}</h3>
                                <p className="bubble-owner">by {bubble.owner_name}</p>
                                <div className="bubble-meta">
                                    <span>{bubble.member_count || 1} members</span>
                                    {bubble.interests?.[0] && (
                                        <span className="interests-preview">
                                            {bubble.interests.filter(Boolean).slice(0, 2).join(', ')}
                                        </span>
                                    )}
                                </div>
                                <div className="card-actions">
                                    {bubble.owner_id === user?.id ? (
                                        <>
                                            {bubble.status === 'open' && (
                                                <button
                                                    className="action-btn close"
                                                    onClick={() => handleClose(bubble.id)}
                                                >
                                                    Close Bubble
                                                </button>
                                            )}
                                            <span className="owner-label">You own this</span>
                                        </>
                                    ) : (
                                        <button
                                            className="action-btn leave"
                                            onClick={() => handleLeave(bubble.id)}
                                        >
                                            Leave
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
