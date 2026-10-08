import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div>Loading...</div>;
    
    if (!user) return <Navigate to="/login" />;

    if (role && user.role !== role) {
        return <Navigate to="/" />;
    }

    return children;
};

export default ProtectedRoute;
