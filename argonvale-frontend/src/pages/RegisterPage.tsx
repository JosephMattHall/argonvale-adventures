import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

const RegisterPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await client.post('/register', {
                username,
                email,
                password
            });
            navigate('/login');
        } catch (err: any) {
            // Simple error handling
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Registration failed. Username or Email might be taken.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel p-8 w-full max-w-md">
                <h2 className="text-3xl font-bold mb-6 text-center text-[var(--primary)]">Create Hero</h2>

                {error && (
                    <div className="mb-4 p-3 bg-[var(--accent-danger)]/20 border border-[var(--accent-danger)] rounded text-sm text-[var(--accent-danger)]">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Username</label>
                        <input
                            type="text"
                            className="w-full p-2 rounded bg-black/30 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-white outline-none transition-colors"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full p-2 rounded bg-black/30 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-white outline-none transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full p-2 rounded bg-black/30 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-white outline-none transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary w-full mt-4">
                        Join the Adventure
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-[var(--text-secondary)]">
                    Already have a hero? <Link to="/login" className="text-[var(--primary)] hover:underline">Login</Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
