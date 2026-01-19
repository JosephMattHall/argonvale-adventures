import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Swords } from 'lucide-react';
import { managementApi, type LeaderboardUser, type LeaderboardCompanion } from '../../api/management';

const LeaderboardView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'pvp' | 'companions'>('pvp');
    const [players, setPlayers] = useState<LeaderboardUser[]>([]);
    const [companions, setCompanions] = useState<LeaderboardCompanion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboards();
    }, []);

    const loadLeaderboards = async () => {
        setLoading(true);
        try {
            const [pData, cData] = await Promise.all([
                managementApi.getPvpLeaderboard(),
                managementApi.getCompanionLeaderboard()
            ]);
            setPlayers(pData);
            setCompanions(cData);
        } catch (error) {
            console.error('Failed to load leaderboards:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-xl text-gold animate-pulse font-medieval">Gathering Legends...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full">
            <div className="text-center mb-10">
                <h1 className="text-5xl font-medieval text-gold mb-2 drop-shadow-glow">Hall of Heroes</h1>
                <p className="text-gray-400 uppercase tracking-widest text-sm">Where Legends Are Carved in Stone</p>
            </div>

            {/* Tab Selection */}
            <div className="flex justify-center mb-8">
                <div className="bg-black/40 p-1 rounded-xl border border-white/10 flex flex-col sm:flex-row w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('pvp')}
                        className={`px-4 sm:px-8 py-3 sm:py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'pvp' ? 'bg-primary text-white shadow-glow-primary' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Swords size={18} />
                        Champions of Arena
                    </button>
                    <button
                        onClick={() => setActiveTab('companions')}
                        className={`px-4 sm:px-8 py-3 sm:py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'companions' ? 'bg-gold text-dark shadow-glow-gold' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Star size={18} />
                        Legendary Companions
                    </button>
                </div>
            </div>

            {/* List View */}
            <div className="flex-1 glass-panel overflow-hidden flex flex-col border-gold/20 shadow-glow-gold/10">
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {activeTab === 'pvp' ? (
                        <div className="space-y-3">
                            {players.length > 0 ? players.map((player, idx) => (
                                <div
                                    key={player.username}
                                    className={`flex items-center gap-4 p-4 rounded-xl border animate-in slide-in-from-bottom-2 duration-300`}
                                    style={{
                                        animationDelay: `${idx * 50}ms`,
                                        background: idx === 0 ? 'rgba(255, 215, 0, 0.05)' : 'rgba(0,0,0,0.2)',
                                        borderColor: idx === 0 ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255,255,255,0.05)'
                                    }}
                                >
                                    <div className="w-10 h-10 flex items-center justify-center font-medieval text-2xl">
                                        {idx === 0 ? <Trophy className="text-gold" /> :
                                            idx === 1 ? <Medal className="text-gray-300" /> :
                                                idx === 2 ? <Medal className="text-orange-400" /> : idx + 1}
                                    </div>
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-dark">
                                        <img src={`/avatars/${player.avatar_url}`} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {player.username}
                                            {idx === 0 && <span className="text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded-full uppercase">Arena King</span>}
                                        </div>
                                        <div className="text-xs text-primary font-bold uppercase tracking-widest">{player.title}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-medieval text-white">{player.pvp_wins}</div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">Victories</div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-20 text-gray-500 italic">No champions have risen yet...</div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {companions.length > 0 ? companions.map((comp, idx) => (
                                <div
                                    key={`${comp.owner_name}-${comp.name}`}
                                    className={`flex items-center gap-4 p-4 rounded-xl border animate-in slide-in-from-bottom-2 duration-300`}
                                    style={{
                                        animationDelay: `${idx * 50}ms`,
                                        background: idx === 0 ? 'rgba(255, 215, 0, 0.05)' : 'rgba(0,0,0,0.2)',
                                        borderColor: idx === 0 ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255,255,255,0.05)'
                                    }}
                                >
                                    <div className="w-10 h-10 flex items-center justify-center font-medieval text-2xl">
                                        {idx === 0 ? <Star className="text-gold animate-pulse" /> : idx + 1}
                                    </div>
                                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-dark">
                                        <img src={`/companions/${comp.image_url}`} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-white">{comp.name}</div>
                                        <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">{comp.species} • Owner: {comp.owner_name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-medieval text-gold">Lv. {comp.level}</div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">{comp.element} Type</div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-20 text-gray-500 italic">No legendary companions recorded...</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="text-center mt-6 text-[10px] text-gray-600 uppercase tracking-[0.4em]">
                Updated every hour by the Argonvale Scribes
            </div>
        </div>
    );
};

export default LeaderboardView;
