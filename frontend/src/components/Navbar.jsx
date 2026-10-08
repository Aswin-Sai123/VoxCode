import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <nav style={{ padding: '1rem', background: '#333', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
            <h2><Link to="/" style={{ color: 'white', textDecoration: 'none' }}>VoxCode</Link></h2>
            <div>
                {user ? (
                    <>
                        <span style={{ marginRight: '1rem' }}>Welcome, {user.name}</span>
                        {user.role === 'COMPANY' && <Link to="/company/dashboard" style={{ marginRight: '1rem', color: '#fff' }}>Dashboard</Link>}
                        {user.role === 'CANDIDATE' && <Link to="/candidate/dashboard" style={{ marginRight: '1rem', color: '#fff' }}>Dashboard</Link>}
                        <button onClick={handleLogout}>Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={{ marginRight: '1rem', color: '#fff' }}>Login</Link>
                        <Link to="/register" style={{ color: '#fff' }}>Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
