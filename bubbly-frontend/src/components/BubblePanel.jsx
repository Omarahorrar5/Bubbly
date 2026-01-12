import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { bubblesAPI } from '../services/api';
import './BubblePanel.css';

export default function BubblePanel({ bubble, onClose, onUpdate }) {
    const { user, isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!bubble) return null;

    const isOwner = user?.id === bubble.owner_id;
    const isMember = bubble.members?.some(m => m.id === user?.id);
    const isOpen = bubble.status === 'open';

    async function handleJoin() {
        setLoading(true);
        setError('');
        try {
            await bubblesAPI.join(bubble.id);
            onUpdate?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleLeave() {
        setLoading(true);
        setError('');
        try {
            await bubblesAPI.leave(bubble.id);
            onUpdate?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleClose() {
        if (!confirm('Are you sure you want to close this bubble?')) return;
        setLoading(true);
        setError('');
        try {
            await bubblesAPI.close(bubble.id);
            onUpdate?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bubble-panel">
            <div className="panel-header">
                <button className="close-btn" onClick={onClose}>×</button>
                <span className={`status-badge ${isOpen ? 'open' : 'closed'}`}>
                    {isOpen ? 'Open' : 'Closed'}
                </span>
            </div>

            <div className="panel-content">
                <h2 className="bubble-title">{bubble.title}</h2>
                <p className="bubble-owner">Created by {bubble.owner_name}</p>

                {bubble.interests?.length > 0 && (
                    <div className="interests-section">
                        {bubble.interests.filter(Boolean).map((interest, i) => (
                            <span key={i} className="interest-chip">{interest.name || interest}</span>
                        ))}
                    </div>
                )}

                <div className="info-grid">
                    <div className="info-item">
                        <span className="info-label">Members</span>
                        <span className="info-value">{bubble.members?.length || bubble.member_count || 1}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Max</span>
                        <span className="info-value">{bubble.max_members || '∞'}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Visibility</span>
                        <span className="info-value">{bubble.visibility || 'Public'}</span>
                    </div>
                </div>

                {bubble.members?.length > 0 && (
                    <div className="members-section">
                        <h4>Members</h4>
                        <div className="members-list">
                            {bubble.members.map((member) => (
                                <div key={member.id} className="member-item">
                                    <div className="member-avatar">
                                        {member.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="member-info">
                                        <span className="member-name">{member.name}</span>
                                        {member.role === 'owner' && (
                                            <span className="owner-badge">Owner</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && <div className="panel-error">{error}</div>}

                {isAuthenticated && isOpen && (
                    <div className="panel-actions">
                        {!isMember && (
                            <button
                                className="action-btn join"
                                onClick={handleJoin}
                                disabled={loading}
                            >
                                {loading ? 'Joining...' : 'Join Bubble'}
                            </button>
                        )}
                        {isMember && !isOwner && (
                            <button
                                className="action-btn leave"
                                onClick={handleLeave}
                                disabled={loading}
                            >
                                {loading ? 'Leaving...' : 'Leave Bubble'}
                            </button>
                        )}
                        {isOwner && (
                            <button
                                className="action-btn close-bubble"
                                onClick={handleClose}
                                disabled={loading}
                            >
                                {loading ? 'Closing...' : 'Close Bubble'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
