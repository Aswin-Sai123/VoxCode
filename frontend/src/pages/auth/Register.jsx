import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [role, setRole] = useState('CANDIDATE');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await register(role, name, email, password);
            setSuccess('Registration successful. You can now log in.');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Register</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {success && <p style={{ color: 'green' }}>{success}</p>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '0.5rem' }}>
                    <option value="CANDIDATE">Candidate</option>
                    <option value="COMPANY">Company</option>
                </select>
                <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: '0.5rem' }} />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '0.5rem' }} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '0.5rem' }} />
                <button type="submit" style={{ padding: '0.5rem', background: '#28A745', color: 'white', border: 'none', cursor: 'pointer' }}>Register</button>
            </form>
        </div>
    );
};

export default Register;
