import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [role, setRole] = useState('CANDIDATE');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(role, email, password);
            navigate(role === 'COMPANY' ? '/company/dashboard' : '/candidate/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = 'http://localhost:5000/api/auth/google';
    };

    return (
        <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Login</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '0.5rem' }}>
                    <option value="CANDIDATE">Candidate</option>
                    <option value="COMPANY">Company</option>
                </select>
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '0.5rem' }} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '0.5rem' }} />
                <button type="submit" style={{ padding: '0.5rem', background: '#007BFF', color: 'white', border: 'none', cursor: 'pointer' }}>Login</button>
            </form>
            {role === 'CANDIDATE' && (
                <button onClick={handleGoogleLogin} style={{ marginTop: '1rem', padding: '0.5rem', width: '100%', background: '#DB4437', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Continue with Google
                </button>
            )}
        </div>
    );
};

export default Login;
