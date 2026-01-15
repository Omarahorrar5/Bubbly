import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interestsAPI, authAPI } from '../services/api';
import './Interests.css';

export default function Interests() {
    const [interests, setInterests] = useState([]);
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchInterests() {
            try {
                const data = await interestsAPI.getAll();
                setInterests(data.interests || []);
            } catch (err) {
                setError('Failed to load interests');
            } finally {
                setLoading(false);
            }
        }
        fetchInterests();
    }, []);

    function toggleInterest(interestId) {
        setSelectedInterests(prev => {
            if (prev.includes(interestId)) {
                return prev.filter(id => id !== interestId);
            } else {
                return [...prev, interestId];
            }
        });
    }

    async function handleContinue() {
        setSaving(true);
        setError('');

        try {
            if (selectedInterests.length > 0) {
                await authAPI.saveInterests(selectedInterests);
            }
            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to save interests');
        } finally {
            setSaving(false);
        }
    }

    // Group interests by category
    const groupedInterests = interests.reduce((acc, interest) => {
        const category = interest.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(interest);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="interests-page">
                <div className="interests-container">
                    <div className="loading">Loading interests...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="interests-page">
            <div className="interests-container">
                <div className="interests-header">
                    <div className="logo">
                        <span className="logo-bubble"></span>
                        <h1>Bubbly</h1>
                    </div>
                    <h2>Choose Your Interests</h2>
                    <p className="subtitle">Select the topics you're interested in to personalize your experience</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="interests-grid">
                    {Object.entries(groupedInterests).map(([category, items]) => (
                        <div key={category} className="interest-category">
                            <h3 className="category-title">{category}</h3>
                            <div className="interest-chips">
                                {items.map(interest => (
                                    <button
                                        key={interest.id}
                                        className={`interest-chip ${selectedInterests.includes(interest.id) ? 'selected' : ''}`}
                                        onClick={() => toggleInterest(interest.id)}
                                    >
                                        {interest.icon && <span className="interest-icon">{interest.icon}</span>}
                                        {interest.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="interests-footer">
                    <p className="selected-count">
                        {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''} selected
                    </p>
                    <button
                        className="continue-button"
                        onClick={handleContinue}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Continue'}
                    </button>
                    <button
                        className="skip-button"
                        onClick={() => navigate('/')}
                        disabled={saving}
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
}
