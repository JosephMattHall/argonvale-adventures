import React, { useState, useEffect, useRef } from 'react';
import { Dumbbell, TrendingUp, Heart, Timer, CheckCircle, Zap } from 'lucide-react';
import { companionsApi } from '../../api/companions';
import { managementApi, type TrainingStatus } from '../../api/management';
import type { Companion } from '../../api/profiles';
import { useUser } from '../../context/UserContext';

const TrainingView: React.FC = () => {
    const { profile, updateProfile } = useUser();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [companions, setCompanions] = useState<Companion[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [status, setStatus] = useState<TrainingStatus | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const timerRef = useRef<any>(null);

    const selectedCompanion = companions.find(c => c.id === selectedId);
    const healingCost = 50;

    useEffect(() => {
        loadData();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        if (selectedId) {
            loadStatus(selectedId);
        } else {
            setStatus(null);
            setTimeRemaining(0);
        }
    }, [selectedId]);

    const loadData = async () => {
        try {
            const companionsData = await companionsApi.getAllCompanions();
            setCompanions(companionsData);
            if (companionsData.length > 0) setSelectedId(companionsData[0].id);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStatus = async (id: number) => {
        try {
            const s = await managementApi.getStatus(id);
            setStatus(s);
            setTimeRemaining(s.time_remaining);

            if (timerRef.current) clearInterval(timerRef.current);
            if (s.time_remaining > 0) {
                timerRef.current = setInterval(() => {
                    setTimeRemaining(prev => {
                        if (prev <= 1) {
                            if (timerRef.current) clearInterval(timerRef.current);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        } catch (error) {
            console.error('Failed to load status:', error);
        }
    };

    const handleStartTraining = async () => {
        if (!selectedId || actionLoading) return;
        setActionLoading(true);
        try {
            await managementApi.startTraining(selectedId);
            await loadStatus(selectedId);
            // Update local companion status
            setCompanions(prev => prev.map(c => c.id === selectedId ? { ...c, status: 'training' } : c));
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to start training');
        } finally {
            setActionLoading(false);
        }
    };

    const handleClaim = async () => {
        if (!selectedId || actionLoading) return;
        setActionLoading(true);
        try {
            const result = await managementApi.claimTraining(selectedId);
            alert(result.message);
            await loadStatus(selectedId);
            await loadData(); // Reload for stats/level
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to claim reward');
        } finally {
            setActionLoading(false);
        }
    };

    const handleHeal = async () => {
        if (!selectedCompanion || actionLoading) return;
        if (!profile || profile.coins < healingCost) {
            alert("Not enough coins!");
            return;
        }

        setActionLoading(true);
        try {
            const result = await companionsApi.healCompanion(selectedCompanion.id);
            setCompanions(prev => prev.map(c => c.id === selectedCompanion.id ? { ...c, hp: c.max_hp } : c));
            updateProfile({ ...profile, coins: result.coins_remaining });
            alert(result.message);
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Healing failed');
        } finally {
            setActionLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}h ${m}m ${s}s`;
    };

    if (loading) return <div className="h-full flex items-center justify-center text-gold">Loading Dojo...</div>;

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6 p-4 overflow-y-auto lg:overflow-hidden">
            {/* Roster */}
            <div className="w-full lg:w-80 flex flex-col gap-4 min-h-[300px] lg:min-h-0">
                <div className="glass-panel p-4 flex-1 flex flex-col min-h-0">
                    <h3 className="font-medieval text-xl text-gold mb-4 flex items-center gap-2">
                        <Dumbbell size={20} />
                        Your Roster
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar max-h-64 lg:max-h-none">
                        {companions.map(comp => (
                            <div
                                key={comp.id}
                                onClick={() => setSelectedId(comp.id)}
                                className={`
                                    p-3 rounded-xl cursor-pointer flex items-center gap-3 border transition-all
                                    ${selectedId === comp.id ? 'bg-primary/20 border-primary shadow-glow-primary/10' : 'bg-black/20 border-white/5 hover:bg-white/5'}
                                `}
                            >
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 relative">
                                    <img src={`/companions/${comp.image_url}`} alt="" className="w-full h-full object-cover" />
                                    {comp.status === 'training' && <div className="absolute inset-0 bg-primary/40 flex items-center justify-center"><Timer size={16} className="text-white animate-spin-slow" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-white truncate">{comp.name}</div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Lv. {comp.level} • {comp.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dojo Stats - Hidden on mobile since currency is in navbar */}
                <div className="glass-panel p-4 bg-gold/5 border-gold/20 hidden lg:block">
                    <div className="text-[10px] font-bold text-gold uppercase tracking-[0.2em] mb-2 text-center">Current Balance</div>
                    <div className="text-2xl font-medieval text-center text-white">💰 {profile?.coins}</div>
                </div>
            </div>

            {/* Training Area */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="glass-panel flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                    {!selectedCompanion ? (
                        <div className="text-gray-500 flex flex-col items-center">
                            <Dumbbell size={64} className="opacity-10 mb-4" />
                            <p className="font-medieval text-lg">Select a trainee from the roster</p>
                        </div>
                    ) : (
                        <div className="w-full max-w-2xl flex flex-col items-center">
                            <div className="mb-8 text-center">
                                <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden border-4 border-gold/30 shadow-glow-gold/20 mb-6 mx-auto group">
                                    <img
                                        src={`/companions/${selectedCompanion.image_url}`}
                                        alt=""
                                        className={`w-full h-full object-cover transition-transform duration-700 ${(status?.status || selectedCompanion.status) === 'training' ? 'scale-110 animate-pulse' : 'group-hover:scale-110'}`}
                                    />
                                </div>
                                <h2 className="text-2xl md:text-4xl font-medieval text-white drop-shadow-glow">{selectedCompanion.name}</h2>
                                <p className="text-gold font-bold uppercase tracking-widest text-xs md:text-sm mt-1">
                                    Lv. {selectedCompanion.level} {selectedCompanion.species}
                                </p>
                            </div>

                            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <div className="glass-panel p-4 bg-black/40 border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <TrendingUp className="text-primary" />
                                        <span className="text-xs font-bold text-gray-400 uppercase">Power Score</span>
                                    </div>
                                    <span className="text-xl font-mono text-white">{selectedCompanion.strength + selectedCompanion.defense + selectedCompanion.speed}</span>
                                </div>
                                <div className="glass-panel p-4 bg-black/40 border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Heart className="text-red-500" />
                                        <span className="text-xs font-bold text-gray-400 uppercase">Health</span>
                                    </div>
                                    <span className="text-xl font-mono text-white">{selectedCompanion.hp}/{selectedCompanion.max_hp}</span>
                                </div>
                            </div>

                            {/* Training Controls */}
                            <div className="w-full glass-panel p-6 border-gold/20 bg-black/60 shadow-2xl">
                                {status?.status === 'training' ? (
                                    <div className="flex flex-col items-center">
                                        {timeRemaining > 0 ? (
                                            <>
                                                <Timer size={48} className="text-primary animate-pulse mb-4" />
                                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Estimated Completion</div>
                                                <div className="text-5xl font-mono text-white mb-2">{formatTime(timeRemaining)}</div>
                                                <p className="text-xs text-center text-gray-400 max-w-xs">Your companion is currently refining their skills. Check back once the timer expires to claim their rewards.</p>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={48} className="text-emerald-400 mb-4 animate-bounce" />
                                                <h3 className="text-2xl font-medieval text-white mb-2">Training Complete!</h3>
                                                <button
                                                    onClick={handleClaim}
                                                    disabled={actionLoading}
                                                    className="btn-primary w-full py-4 text-xl flex items-center justify-center gap-3 shadow-glow-primary/30"
                                                >
                                                    <Zap className="fill-current" />
                                                    CLAIM REWARDS
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-2 mb-6">
                                            <Timer size={24} className="text-gold" />
                                            <span className="text-lg font-medieval text-gold">Intensive Ninja Training</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8 w-full mb-8">
                                            <div className="text-center">
                                                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Duration</div>
                                                <div className="text-2xl font-mono text-white">{selectedCompanion.level} Hour(s)</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Guaranteed XP</div>
                                                <div className="text-2xl font-mono text-white">+{selectedCompanion.level * 100}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleStartTraining}
                                            disabled={actionLoading}
                                            className="btn-gold w-full py-4 text-xl flex items-center justify-center gap-3 shadow-glow-gold/30"
                                        >
                                            <Dumbbell />
                                            BEGIN TRAINING COURSE
                                        </button>
                                        <p className="text-[10px] text-gray-500 uppercase mt-4 tracking-widest">Training duration scales with companion level</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                {selectedCompanion && selectedCompanion.hp < selectedCompanion.max_hp && selectedCompanion.status !== 'training' && (
                    <div className="glass-panel p-4 flex items-center justify-between border-emerald-500/20 bg-emerald-500/5 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Heart size={20} />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-white uppercase">Critical Recovery</div>
                                <div className="text-[10px] text-gray-400">Restore to maximum vitality immediately</div>
                            </div>
                        </div>
                        <button
                            onClick={handleHeal}
                            disabled={actionLoading}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-glow-emerald/20"
                        >
                            <TrendingUp size={16} />
                            Heal (💰 50)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainingView;
