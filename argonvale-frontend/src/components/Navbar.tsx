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
    const { unreadCount } = useNotifications();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    if (!isAuthenticated || !profile) return null;

    return (
        <nav className="bg-dark-lighter border-b border-border-subtle px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
                <Link to="/game" className="flex items-center group">
                    <img
                        src={logo}
                        alt="Argonvale Logo"
                        className="h-24 w-auto group-hover:drop-shadow-glow-gold transition-all"
                    />
                </Link>
                <div className="h-6 w-px bg-border-subtle mx-2"></div>
                <nav className="flex items-center gap-4">
                    <Link to="/game/explore" className="text-gray-300 hover:text-white transition-colors">Play</Link>
                    <Link to="/game/companions" className="text-gray-300 hover:text-white transition-colors">Companions</Link>
                    <Link to="/game/profile/me" className="text-gray-300 hover:text-white transition-colors">Profile</Link>
                    <Link to="/game/messages" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                        Messages
                        {unreadCount > 0 && (
                            <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </Link>
                </nav>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-dark rounded-full px-4 py-1.5 border border-gold/20 shadow-glow-gold/10">
                        <Coins size={18} className="text-gold" />
                        <span className="font-bold text-gold">{profile.coins}</span>
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
                        className="bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded-full w-8 h-8 flex items-center justify-center transition-all"
                        title="Add Test Coins (+1000)"
                    >
                        +
                    </button>
                </div>

                <div className="flex items-center gap-4 border-l border-border-subtle pl-6">
                    <Link to="/game/profile/me" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="text-right">
                            <div className="text-sm font-semibold text-white">{profile.username}</div>
                            <div className="text-[10px] text-gray-400 capitalize">{profile.bio ? 'Explorer' : 'New Player'}</div>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-dark border border-border-subtle flex items-center justify-center">
                            <img src={profile.avatar_url || "/default-avatar.png"} alt="" className="w-8 h-8 opacity-50" />
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
