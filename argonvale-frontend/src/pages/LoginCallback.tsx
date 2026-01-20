import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginCallback: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const needsStarter = params.get('needs_starter') === 'true';

        if (token) {
            login(token);
            if (needsStarter) {
                navigate('/starter');
            } else {
                navigate('/game');
            }
        } else {
            console.error('No token found in callback URL');
            navigate('/login');
        }
    }, [location, login, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg font-medieval animate-pulse">Authenticating with the High Council...</p>
            </div>
        </div>
    );
};

export default LoginCallback;
