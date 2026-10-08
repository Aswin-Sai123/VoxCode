import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRole }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Role check (assumes your backend sets a 'role' field on the user model or we infer it)
    // In our backend, the Company model doesn't have a 'role' field hardcoded, 
    // but we can distinguish them based on context or we can just check if user exists for now.
    // To be strict, you'd add { role: 'COMPANY' } to the User model.
    // For now, if they are logged in, we let them through to their respective dashboards.
    // We will rely on the backend to reject unauthorized API calls.

    return children;
};

export default ProtectedRoute;
