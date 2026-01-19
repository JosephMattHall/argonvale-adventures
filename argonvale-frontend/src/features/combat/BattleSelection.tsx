import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { profilesApi, type Companion } from '../../api/profiles';
import { equipmentApi, type Item } from '../../api/equipment';
import { useGameSocket } from '../../hooks/useGameSocket';
import { Swords, Zap, Shield, Heart, Skull } from 'lucide-react';

const BattleSelection: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { sendCommand, messages } = useGameSocket();
    const { profile } = useUser();

    // Encounter Context (from Exploration)
    // Structure: { enemy_name, enemy_type, enemy_hp, enemy_max_hp, enemy_stats, ... }
    const encounterContext = location.state?.encounterContext;
    const encounterCombatId = location.state?.combatId;
    const isEncounterMode = !!encounterContext;

    const [companions, setCompanions] = useState<Companion[]>([]);
    const [equippedItems, setEquippedItems] = useState<Item[]>([]);
    const [selectedCompanionId, setSelectedCompanionId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [isQueuing, setIsQueuing] = useState(false);
    const [initialMsgCount, setInitialMsgCount] = useState(0);

    useEffect(() => {
        const loadData = async () => {
            if (!profile) return;
            try {
                const [compData, invData] = await Promise.all([
                    profilesApi.getUserCompanions(profile.username),
                    equipmentApi.getInventory()
                ]);
                setCompanions(compData);
                setEquippedItems(invData.filter(i => i.is_equipped));

                // Auto-select first active companion
                const active = compData.find(c => c.is_active) || compData[0];
                if (active) setSelectedCompanionId(active.id);

            } catch (e) {
                console.error("Failed to load battle data", e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [profile]);

    useEffect(() => {
        if (!isStarting) return;
        const newMessages = messages.slice(initialMsgCount);

        // Wait for CombatStarted to be confirmed/re-sent for our session
        // For PvE Encounter join, we look for a CombatStarted that has our companion data populated
        const combatStarted = newMessages.find((m: any) =>
            m.type === 'CombatStarted' &&
            m.attacker_id === profile?.id &&
            m.context?.companion_id === selectedCompanionId // Confirm it's the one we just joined
        );

        if (combatStarted) {
            setIsStarting(false);
            setIsQueuing(false);
            navigate('/game/battle', {
                state: {
                    battleContext: combatStarted.context,
                    combatId: combatStarted.combat_id,
                    origin: location.state?.origin // Pass origin through
                }
            });
        }
    }, [messages, profile, navigate, isStarting, initialMsgCount, selectedCompanionId, location.state]);

    const handleStartEncounter = () => {
        if (!selectedCompanionId || !encounterCombatId) return;

        setIsStarting(true);
        setInitialMsgCount(messages.length);

        // For Encounter Mode, we are "Joining" the already created combat with our selected companion
        // We reuse EnterCombat but pass the combat_id if backend supports it, OR
        // we emit a new "JoinEncounter" event if we added that. 
        // Based on current backend implementation, EnterCombat creates a NEW combat.
        // We need to support joining the specific one.
        // Let's send a special EnterCombat payload or a new type.
        // We'll use "JoinPvEEncounter" to be explicit.

        sendCommand({
            type: "JoinPvEEncounter",
            combat_id: encounterCombatId,
            companion_id: selectedCompanionId,
            context: encounterContext // Pass back the context so backend can merge it
        });
    };

    const handleJoinQueue = () => {
        if (selectedCompanionId === null) return;
        setIsQueuing(true);
        setInitialMsgCount(messages.length);
        sendCommand({
            type: "JoinPvPQueue",
            companion_id: selectedCompanionId
        });
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Preparing the arena...</div>;

    const selectedCompanion = companions.find(c => c.id === selectedCompanionId);

    return (
        <div className="h-full flex flex-col p-6">
            <h2 className="text-3xl font-medieval text-gold mb-8 flex items-center gap-3">
                <Swords className="text-primary" size={32} />
                {isEncounterMode ? 'Wild Encounter!' : 'Battle Arena'}
            </h2>

            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8 flex-1 overflow-y-auto lg:overflow-hidden pr-1 custom-scrollbar">

                {/* Left Col: Companion Selection */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Choose Your Hero</h3>
                        <div className="space-y-3">
                            {companions.map(comp => (
                                <div
                                    key={comp.id}
                                    onClick={() => setSelectedCompanionId(comp.id)}
                                    className={`
                                        glass-panel p-4 cursor-pointer transition-all flex items-center gap-4
                                        ${selectedCompanionId === comp.id ? 'border-primary bg-primary/10' : 'hover:bg-white/5'}
                                    `}
                                >
                                    <div className="w-12 h-12 bg-dark rounded-lg flex items-center justify-center text-2xl overflow-hidden border border-white/10 shadow-inner">
                                        {comp.image_url ? <img src={`/companions/${comp.image_url}`} alt="" className="w-full h-full object-cover" /> : '👤'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-white text-sm">{comp.name}</div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                            <Heart size={10} className="text-red-500" /> {comp.hp}/{comp.max_hp}
                                            <Shield size={10} className="text-blue-400 ml-1" /> STR:{comp.strength}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Active Gear Summary */}
                    <div className="glass-panel p-4 bg-black/40 border-gold/10">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold mb-3">Equipped Gear</h4>
                        <div className="flex flex-wrap gap-2">
                            {equippedItems.length > 0 ? equippedItems.map(item => (
                                <div key={item.id} className="text-[9px] bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-300 flex items-center gap-1">
                                    {item.item_type === 'weapon' ? <Swords size={10} /> : <Shield size={10} />}
                                    {item.name}
                                </div>
                            )) : <div className="text-[10px] text-gray-500 italic">No gear equipped</div>}
                        </div>
                    </div>
                </div>

                {/* Right Col: Encounter OR PvP Lobby */}
                <div className="lg:col-span-2 flex flex-col min-h-0 justify-center">

                    {isEncounterMode ? (
                        <div className="glass-panel p-8 flex flex-col items-center gap-6 border-red-500/30 bg-red-900/10">
                            <h3 className="text-xl font-medieval text-red-400 animate-pulse">A Wild Enemy Appeared!</h3>

                            <div className="w-32 h-32 bg-black/40 rounded-full flex items-center justify-center border-4 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                                <span className="text-6xl">
                                    {encounterContext.enemy_type === 'Fire' ? '🔥' :
                                        encounterContext.enemy_type === 'Water' ? '💧' :
                                            encounterContext.enemy_type === 'Earth' ? '🗿' : '👹'}
                                </span>
                            </div>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-white mb-2">{encounterContext.enemy_name}</div>
                                <div className="flex items-center gap-4 justify-center text-sm text-gray-400">
                                    <span className="flex items-center gap-1"><Skull size={14} /> Level {encounterContext.enemy_level || 1}</span>
                                    <span className="flex items-center gap-1"><Heart size={14} /> {encounterContext.enemy_hp} HP</span>
                                </div>
                            </div>

                            <button
                                disabled={selectedCompanionId === null || (selectedCompanion?.hp === 0) || isStarting}
                                onClick={handleStartEncounter}
                                className="mt-4 btn-primary py-4 px-12 text-xl w-full max-w-md shadow-glow-primary/40 animate-pulse-slow"
                            >
                                {isStarting ? 'Engaging...' : 'FIGHT!'}
                            </button>
                        </div>
                    ) : (
                        <div className="glass-panel p-8 flex flex-col items-center gap-6 border-blue-500/10 bg-blue-900/5">
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-medieval text-blue-300">PvP Arena Lobby</h3>
                                <p className="text-sm text-gray-400 max-w-md">Challenge other players to real-time combat. defeats grant rewards and glory on the leaderboards.</p>
                            </div>

                            <div className="w-32 h-32 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
                                <Swords size={48} className="text-blue-400" />
                            </div>

                            <button
                                disabled={selectedCompanionId === null || (selectedCompanion?.hp === 0) || isStarting || isQueuing}
                                onClick={handleJoinQueue}
                                className="mt-4 btn-gold py-4 px-12 text-xl w-full max-w-md shadow-glow-gold/20"
                            >
                                <Zap className={`inline mr-2 ${isQueuing ? 'animate-spin' : ''}`} />
                                {isQueuing ? 'Searching for Opponent...' : 'Join PvP Queue'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BattleSelection;
