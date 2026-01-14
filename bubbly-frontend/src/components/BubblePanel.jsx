import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { bubblesAPI, messagesAPI } from '../services/api';
import './BubblePanel.css';

export default function BubblePanel({ bubble, onClose, onUpdate }) {
    const { user, isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const messagesEndRef = useRef(null);

    const isOwner = user?.id === bubble?.owner_id;
    const isMember = bubble?.members?.some(m => m.id === user?.id);
    const isOpen = bubble?.status === 'open';

    useEffect(() => {
        if (showChat && isMember && bubble?.id) {
            loadMessages();
        }
    }, [showChat, bubble?.id, isMember]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    async function loadMessages() {
        setChatLoading(true);
        try {
            const data = await messagesAPI.getBubbleMessages(bubble.id);
            setMessages(data.messages || []);
        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setChatLoading(false);
        }
    }

    async function handleSendMessage(e) {
        e.preventDefault();
        if (!newMessage.trim() || sendingMessage) return;

        setSendingMessage(true);
        try {
            await messagesAPI.sendMessage(bubble.id, newMessage.trim());
            setNewMessage('');
            await loadMessages();
        } catch (err) {
            setError(err.message);
        } finally {
            setSendingMessage(false);
        }
    }

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
            setShowChat(false);
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

    function formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (!bubble) return null;

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

                {bubble.members?.length > 0 && !showChat && (
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

                {/* Chat Section - Only for members of open bubbles */}
                {isAuthenticated && isMember && isOpen && showChat && (
                    <div className="chat-section">
                        <div className="chat-header">
                            <h4>Chat</h4>
                            <button className="chat-back-btn" onClick={() => setShowChat(false)}>
                                ← Back
                            </button>
                        </div>
                        <div className="chat-messages">
                            {chatLoading ? (
                                <div className="chat-loading">Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className="chat-empty">No messages yet. Start the conversation!</div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`chat-message ${msg.sender_id === user?.id ? 'own' : ''}`}
                                    >
                                        <div className="message-sender">{msg.sender_name}</div>
                                        <div className="message-content">{msg.content}</div>
                                        <div className="message-time">{formatTime(msg.created_at)}</div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <form className="chat-input-form" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                className="chat-input"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                disabled={sendingMessage}
                            />
                            <button
                                type="submit"
                                className="chat-send-btn"
                                disabled={sendingMessage || !newMessage.trim()}
                            >
                                {sendingMessage ? '...' : '→'}
                            </button>
                        </form>
                    </div>
                )}

                {error && <div className="panel-error">{error}</div>}

                {isAuthenticated && isOpen && (
                    <div className="panel-actions">
                        {isMember && !showChat && (
                            <button
                                className="action-btn chat"
                                onClick={() => setShowChat(true)}
                            >
                                Open Chat
                            </button>
                        )}
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
