import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/game');
        }
    }, [isAuthenticated, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center p-8">
            <div className="glass-panel p-10 max-w-2xl text-center">
                <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--primary)' }}>Argonvale Adventures</h1>
                <p className="mb-8 text-lg">A real-time, event-driven multiplayer RPG.</p>
                <div className="flex gap-4 justify-center">
                    <Link to="/login"><button className="btn-primary">Login</button></Link>
                    <Link to="/register"><button className="glass-panel px-6 py-2 rounded-md">Register</button></Link>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
