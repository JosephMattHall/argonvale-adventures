import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Coins } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import { profilesApi } from '../api/profiles';
import logo from '../assets/logo.png';

const Navbar: React.FC = () => {
    const { logout, isAuthenticated } = useAuth();
    const { profile, updateProfile } = useUser();
    const { } = useNotifications();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    if (!isAuthenticated || !profile) return null;

    return (
        <nav className="bg-dark-lighter border-b border-border-subtle px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-6">
                <Link to="/game" className="flex items-center group">
                    <img
                        src={logo}
                        alt="Argonvale Logo"
                        className="h-12 sm:h-24 w-auto group-hover:drop-shadow-glow-gold transition-all"
                    />
                </Link>
                <div className="hidden sm:block h-6 w-px bg-border-subtle mx-2"></div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 bg-dark rounded-full px-3 sm:px-4 py-1 sm:py-1.5 border border-gold/20 shadow-glow-gold/10">
                        <Coins size={16} className="text-gold" />
                        <span className="font-bold text-gold text-sm sm:text-base">{profile.coins}</span>
                    </div>
                    <button
                        onClick={async () => {
                            try {
                                const newProfile = await profilesApi.addTestCoins();
                                updateProfile(newProfile);
                            } catch (error) {
                                console.error('Failed to add test coins:', error);
                            }
                        }}
                        className="bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-all"
                        title="Add Test Coins (+1000)"
                    >
                        +
                    </button>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 border-l border-border-subtle pl-3 sm:pl-6">
                    <Link to="/game/profile/me" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
                        <div className="text-right">
                            <div className="text-sm font-semibold text-white">{profile.username}</div>
                            <div className="text-[10px] text-gray-400 capitalize">{profile.bio ? 'Explorer' : 'New Player'}</div>
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-dark border border-border-subtle flex items-center justify-center">
                            <img src={profile.avatar_url || "/default-avatar.png"} alt="" className="w-6 h-6 sm:w-8 sm:h-8 opacity-50" />
                        </div>
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
