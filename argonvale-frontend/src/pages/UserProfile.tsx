import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { profilesApi } from '../api/profiles';
import type { Profile, Companion } from '../api/profiles';
import { friendsApi } from '../api/friends';
import CompanionCard from '../components/CompanionCard';
import { User, UserPlus, MessageSquare, TrendingUp, Coins, Swords } from 'lucide-react';

const UserProfile: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [companions, setCompanions] = useState<Companion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFriend, setIsFriend] = useState(false);

    useEffect(() => {
        if (username) {
            loadProfile();
        }
    }, [username]);

    const loadProfile = async () => {
        if (!username) return;

        try {
            const profileData = await profilesApi.getUserProfile(username);
            setProfile(profileData);

            const companionsData = await profilesApi.getUserCompanions(username);
            setCompanions(companionsData);

            // Check if already friends
            const friends = await friendsApi.getFriends();
            setIsFriend(friends.some(f => f.username === username));
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async () => {
        if (!username) return;

        try {
            await friendsApi.sendFriendRequest(username);
            alert('Friend request sent!');
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to send friend request');
        }
    };

    const handleMessage = () => {
        if (profile) {
            navigate(`/game/messages/${profile.id}`);
        }
    };

    const handleChallenge = async (targetComp: Companion) => {
        if (!profile) return;

        try {
            // In a real app, we might want to show a modal to select WHICH of our companions to use.
            // For now, we'll use the user's active companion as per backend logic.
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/messages/challenge?recipient_id=${profile.id}&companion_id=${targetComp.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                alert(`Challenge sent to ${targetComp.name}!`);
                navigate(`/game/messages/${profile.id}`);
            } else {
                const err = await response.json();
                alert(err.detail || 'Failed to send challenge');
            }
        } catch (error) {
            console.error('Challenge error:', error);
            alert('Failed to send challenge');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-xl text-gray-400">Loading profile...</div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-xl text-danger">User not found</div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-6">
            <h1 className="text-3xl font-medieval text-gold mb-6">{profile.username}'s Profile</h1>

            <div className="space-y-6">
                {/* Profile Info */}
                <div className="glass-panel p-6">
                    <div className="flex items-start gap-6">
                        {/* Avatar */}
                        <div className="w-32 h-32 bg-dark rounded-lg flex items-center justify-center border-2 border-gold shrink-0">
                            <User size={64} className="text-gold" />
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-2xl font-medieval text-white">{profile.username}</h2>
                                <div className="flex items-center gap-4 bg-dark rounded-full px-4 py-1.5 border border-gold/20 shadow-glow-gold/10">
                                    <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                                        <span className="text-[10px] uppercase font-bold text-gray-400">PvP Record</span>
                                        <span className="text-secondary font-bold font-mono">{profile.pvp_wins || 0}/{profile.pvp_total || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Coins size={18} className="text-gold" />
                                        <span className="font-bold text-gold">{profile.coins}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bio */}
                            <div className="mt-4">
                                <label className="text-sm text-gray-400 uppercase tracking-wide block mb-2">Bio</label>
                                <p className="text-gray-300">{profile.bio || 'This user hasn\'t written a bio yet.'}</p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-6">
                                {!isFriend && (
                                    <button
                                        onClick={handleAddFriend}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        <UserPlus size={18} />
                                        Add Friend
                                    </button>
                                )}
                                <button
                                    onClick={handleMessage}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <MessageSquare size={18} />
                                    Message
                                </button>
                                <button
                                    className="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed"
                                    disabled
                                >
                                    <TrendingUp size={18} />
                                    View Trades (Coming Soon)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Companions - Horizontal Row */}
                <div className="space-y-4">
                    <h3 className="text-xl font-medieval text-white">Active Companions</h3>
                    {companions.length > 0 ? (
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                            {companions.map((companion) => (
                                <CompanionCard
                                    key={companion.id}
                                    companion={companion}
                                    action={{
                                        label: "Challenge",
                                        icon: <Swords size={14} />,
                                        onClick: (c) => handleChallenge(c)
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="glass-panel p-6 text-center text-gray-400">
                            No active companions
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
