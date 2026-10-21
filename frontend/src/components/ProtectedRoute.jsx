import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRole }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Enforce role-based access: redirect to their own dashboard if they try to access another role's page
    const activeRole = user.role || localStorage.getItem('userRole');
    if (allowedRole && activeRole && activeRole !== allowedRole) {
        const redirectPath = activeRole === 'COMPANY' ? '/company/dashboard' : '/candidate/dashboard';
        return <Navigate to={redirectPath} replace />;
    }

    return children;
};

export default ProtectedRoute;

