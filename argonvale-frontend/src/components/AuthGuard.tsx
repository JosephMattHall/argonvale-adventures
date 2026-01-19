
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext'; // Ensure profile logic is checked if needed

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // We could also check profile loading state here if we want to ensure profile is ready
    const { loading: userLoading } = useUser();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) {
        return null; // Or a loading spinner while redirecting
    }

    if (userLoading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-dark text-gold font-medieval">Loading Realm...</div>;
    }

    return <>{children}</>;
};
