import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Register.css';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        sex: '',
        age: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authAPI.register(
                formData.name,
                formData.email,
                formData.password,
                formData.sex,
                formData.age
            );
            navigate('/interests');
        } catch (err) {
            setError(err.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="register-page">
            <div className="register-container">
                <div className="register-header">
                    <div className="logo">
                        <span className="logo-bubble"></span>
                        <h1>Bubbly</h1>
                    </div>
                    <p className="subtitle">Join the bubble community</p>
                </div>

                <form onSubmit={handleSubmit} className="register-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Create a password"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="sex">Sex</label>
                            <select
                                id="sex"
                                name="sex"
                                value={formData.sex}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="age">Age</label>
                            <input
                                type="number"
                                id="age"
                                name="age"
                                value={formData.age}
                                onChange={handleChange}
                                placeholder="Age"
                                min="13"
                                max="120"
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="register-button" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>

                    <div className="signin-link">
                        Already have an account? <Link to="/login">Sign In</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
