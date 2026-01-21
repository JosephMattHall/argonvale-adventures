import React, { useState, useEffect } from 'react';
import { profilesApi } from '../api/profiles';
import type { Profile, Companion } from '../api/profiles';
import CompanionCard from '../components/CompanionCard';
import { User, Edit2, Save, Coins } from 'lucide-react';

const MyProfile: React.FC = () => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [companions, setCompanions] = useState<Companion[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [bio, setBio] = useState('');
    const [selectedTitle, setSelectedTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const profileData = await profilesApi.getMyProfile();
            setProfile(profileData);
            setBio(profileData.bio);
            setSelectedTitle(profileData.title);

            const companionsData = await profilesApi.getUserCompanions(profileData.username);
            setCompanions(companionsData);
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await profilesApi.updateMyProfile({ bio, title: selectedTitle });
            setIsEditing(false);
            loadProfile();
        } catch (error) {
            console.error('Failed to update profile:', error);
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
                <div className="text-xl text-danger">Failed to load profile</div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-6">
            <h1 className="text-3xl font-medieval text-gold mb-6">My Profile</h1>

            <div className="space-y-6">
                {/* Profile Info */}
                <div className="glass-panel p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-dark rounded-lg flex items-center justify-center border-2 border-gold shrink-0">
                            <User size={isMobile ? 48 : 64} className="text-gold" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 w-full text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-medieval text-white">{profile.username}</h2>
                                    <div className="text-secondary font-bold text-xs uppercase tracking-widest">{profile.title}</div>
                                </div>
                                <div className="flex items-center justify-center gap-4 bg-dark rounded-full px-4 py-1.5 border border-gold/20 shadow-glow-gold/10">
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

                            {/* Title Selection */}
                            {isEditing && (
                                <div className="mb-6 bg-dark/30 p-4 rounded-lg border border-white/5">
                                    <label className="text-sm text-gray-400 uppercase tracking-wide">Select Your Title</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {JSON.parse(profile.titles_unlocked || '["Novice Adventurer"]').map((t: string) => (
                                            <button
                                                key={t}
                                                onClick={() => setSelectedTitle(t)}
                                                className={`px-3 py-1 rounded-full border text-xs font-bold transition-all ${selectedTitle === t
                                                    ? 'bg-secondary/20 border-secondary text-secondary shadow-glow'
                                                    : 'bg-dark border-white/10 text-gray-400 hover:border-gray-500'
                                                    }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bio */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm text-gray-400 uppercase tracking-wide">Bio</label>
                                    {!isEditing ? (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-1 text-primary hover:text-primary-dark text-sm"
                                        >
                                            <Edit2 size={14} />
                                            Edit
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSave}
                                            className="flex items-center gap-1 text-success hover:text-success-dark text-sm"
                                        >
                                            <Save size={14} />
                                            Save
                                        </button>
                                    )}
                                </div>
                                {isEditing ? (
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        className="input-field w-full h-24 resize-none"
                                        placeholder="Tell others about yourself..."
                                    />
                                ) : (
                                    <p className="text-gray-300">{bio || 'No bio yet.'}</p>
                                )}
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
                                <CompanionCard key={companion.id} companion={companion} />
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

export default MyProfile;
