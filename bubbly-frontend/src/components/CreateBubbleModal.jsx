import { useState, useEffect } from 'react';
import { interestsAPI } from '../services/api';
import './CreateBubbleModal.css';

export default function CreateBubbleModal({ onClose, onCreate, selectedLocation }) {
    const [title, setTitle] = useState('');
    const [maxMembers, setMaxMembers] = useState(10);
    const [visibility, setVisibility] = useState('public');
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [interests, setInterests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadInterests();
    }, []);

    async function loadInterests() {
        try {
            const data = await interestsAPI.getAll();
            setInterests(data.interests || []);
        } catch (err) {
            console.error('Failed to load interests:', err);
        }
    }

    function toggleInterest(interestId) {
        setSelectedInterests(prev =>
            prev.includes(interestId)
                ? prev.filter(id => id !== interestId)
                : [...prev, interestId]
        );
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!selectedLocation) {
            setError('Please click on the map to select a location');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onCreate({
                title,
                maxMembers,
                visibility,
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lng,
                interestIds: selectedInterests,
            });
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="create-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create a Bubble</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && <div className="modal-error">{error}</div>}

                    <div className="form-field">
                        <label>Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="What's your bubble about?"
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label>Location</label>
                        {selectedLocation ? (
                            <div className="location-display">
                                <span className="location-pin">📍</span>
                                <span>Location selected on map</span>
                            </div>
                        ) : (
                            <div className="location-prompt">
                                Click on the map to select a location
                            </div>
                        )}
                    </div>

                    <div className="form-field">
                        <label>Max Members: {maxMembers}</label>
                        <input
                            type="range"
                            min="2"
                            max="50"
                            value={maxMembers}
                            onChange={e => setMaxMembers(parseInt(e.target.value))}
                            className="slider"
                        />
                    </div>

                    <div className="form-field">
                        <label>Visibility</label>
                        <div className="visibility-options">
                            <button
                                type="button"
                                className={`vis-option ${visibility === 'public' ? 'active' : ''}`}
                                onClick={() => setVisibility('public')}
                            >
                                🌍 Public
                            </button>
                            <button
                                type="button"
                                className={`vis-option ${visibility === 'private' ? 'active' : ''}`}
                                onClick={() => setVisibility('private')}
                            >
                                🔒 Private
                            </button>
                        </div>
                    </div>

                    {interests.length > 0 && (
                        <div className="form-field">
                            <label>Interests (optional)</label>
                            <div className="interests-grid">
                                {interests.map(interest => (
                                    <button
                                        key={interest.id}
                                        type="button"
                                        className={`interest-btn ${selectedInterests.includes(interest.id) ? 'active' : ''}`}
                                        onClick={() => toggleInterest(interest.id)}
                                    >
                                        {interest.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="create-btn"
                        disabled={loading || !selectedLocation}
                    >
                        {loading ? 'Creating...' : 'Create Bubble'}
                    </button>
                </form>
            </div>
        </div>
    );
}
