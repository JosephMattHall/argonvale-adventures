import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { profilesApi, type Companion } from '../../api/profiles';
import { equipmentApi, type Item } from '../../api/equipment';
import { useGameSocket } from '../../hooks/useGameSocket';
import { Swords, Zap, Shield, Heart, Skull, Package, Utensils, Sparkles, ChevronRight, Snowflake } from 'lucide-react';

const BattleSelection: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { sendCommand, messages } = useGameSocket();
    const { profile } = useUser();

    const encounterContext = location.state?.encounterContext;
    const encounterCombatId = location.state?.combatId;
    const isEncounterMode = !!encounterContext;

    const [companions, setCompanions] = useState<Companion[]>([]);
    const [fullInventory, setFullInventory] = useState<Item[]>([]);
    const [selectedCompanionId, setSelectedCompanionId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [isQueuing, setIsQueuing] = useState(false);
    const [initialMsgCount, setInitialMsgCount] = useState(0);
    const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
    const [showSelectionPopover, setShowSelectionPopover] = useState(false);
    const [showActionPopover, setShowActionPopover] = useState(false);

    const loadData = async () => {
        if (!profile) return;
        try {
            const [compData, invData] = await Promise.all([
                profilesApi.getUserCompanions(profile.username),
                equipmentApi.getInventory()
            ]);
            setCompanions(compData);
            setFullInventory(invData);

            const active = compData.find(c => c.is_active) || compData[0];
            if (active && !selectedCompanionId) setSelectedCompanionId(active.id);
        } catch (e) {
            console.error("Failed to load battle data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [profile]);

    useEffect(() => {
        if (!isStarting) return;
        const newMessages = messages.slice(initialMsgCount);
        const combatStarted = newMessages.find((m: any) =>
            m.type === 'CombatStarted' &&
            m.attacker_id === profile?.id &&
            m.context?.companion_id === selectedCompanionId
        );

        if (combatStarted) {
            setIsStarting(false);
            setIsQueuing(false);
            navigate('/game/battle', {
                state: {
                    battleContext: combatStarted.context,
                    combatId: combatStarted.combat_id,
                    origin: location.state?.origin
                }
            });
        }
    }, [messages, profile, navigate, isStarting, initialMsgCount, selectedCompanionId]);

    const handleToggleEquip = async (itemId: number) => {
        try {
            await equipmentApi.toggleEquip(itemId);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Action failed");
        }
    };

    const handleStartEncounter = () => {
        if (!selectedCompanionId || !encounterCombatId) return;
        setIsStarting(true);
        setInitialMsgCount(messages.length);
        sendCommand({
            type: "JoinPvEEncounter",
            combat_id: encounterCombatId,
            companion_id: selectedCompanionId,
            context: encounterContext
        });
    };

    const handleJoinQueue = () => {
        if (selectedCompanionId === null) return;
        setIsQueuing(true);
        setInitialMsgCount(messages.length);
        sendCommand({ type: "JoinPvPQueue", companion_id: selectedCompanionId });
    };

    if (loading) return <div className="p-8 text-center text-gold font-medieval animate-pulse">Summoning combatants...</div>;

    const selectedCompanion = companions.find(c => c.id === selectedCompanionId);
    const equippedItems = fullInventory.filter(i => i.is_equipped);
    const equipmentSlots = Array(8).fill(null).map((_, i) => equippedItems[i] || null);

    const hasFreezing = equippedItems.some(i => i.effect?.type === 'freeze');
    const hasHealing = equippedItems.some(i => i.effect?.type === 'heal' || i.name.toLowerCase().includes('potion')); // Simple heuristic for healing items if type not set

    // Calculate Total Power
    const totalBonusAtk = equippedItems.reduce((acc, i) => {
        const atkVal = i.weapon_stats?.attack ? Object.values(i.weapon_stats.attack).reduce((sum: number, v: any) => sum + v, 0) : 0;
        return acc + (atkVal as number);
    }, 0);
    const totalBonusDef = equippedItems.reduce((acc, i) => {
        const defVal = i.weapon_stats?.defense ? Object.values(i.weapon_stats.defense).reduce((sum: number, v: any) => sum + v, 0) : 0;
        return acc + (defVal as number);
    }, 0);

    return (
        <div className="h-full flex flex-col p-4 lg:p-6 overflow-hidden bg-gradient-to-br from-black to-[#0a0a0c]">
            {/* Header */}
            <header className="flex justify-between items-center mb-6">
                <h2 className="text-2xl lg:text-3xl font-medieval text-gold flex items-center gap-3">
                    <Swords className="text-primary" size={32} />
                    {isEncounterMode ? 'Battle Preparation' : 'Arena Entrance'}
                </h2>
                {isEncounterMode && (
                    <div className="px-4 py-1.5 bg-red-950/20 border border-red-500/30 rounded-full text-[10px] text-red-400 font-bold uppercase tracking-widest animate-pulse">
                        Wild Objective Identified
                    </div>
                )}
            </header>

            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Left Panel: Hero Selection & Setup */}
                <div className="lg:col-span-5 flex flex-col gap-6 overflow-hidden">
                    <section className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center justify-between">
                            Active Roster
                            <span className="text-gray-700">{companions.length} Available</span>
                        </h3>
                        <div className="space-y-2">
                            {companions.map(comp => (
                                <div
                                    key={comp.id}
                                    onClick={() => setSelectedCompanionId(comp.id)}
                                    className={`
                                        glass-panel p-3 cursor-pointer transition-all flex items-center gap-3 border
                                        ${selectedCompanionId === comp.id ? 'border-primary bg-primary/10 shadow-glow-primary/5' : 'border-white/5 hover:border-white/10 hover:bg-white/5'}
                                    `}
                                >
                                    <div className="w-14 h-14 bg-dark rounded flex items-center justify-center overflow-hidden border border-white/10 shadow-inner group">
                                        <img src={`/companions/${comp.image_url}`} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <span className="font-medieval text-white text-sm truncate">{comp.name}</span>
                                            <span className="text-[9px] text-gray-400 font-bold">LVL {comp.level}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                <div className="h-full bg-red-500/80 shadow-[0_0_5px_rgba(239,68,68,0.5)]" style={{ width: `${(comp.hp / comp.max_hp) * 100}%` }} />
                                            </div>
                                            <div className="flex items-center gap-1 text-[9px] text-gray-300 font-mono">
                                                <Heart size={10} className="text-red-500" /> {comp.hp}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                <div className="h-full bg-orange-500/80 shadow-[0_0_5px_rgba(249,115,22,0.5)]" style={{ width: `${comp.hunger || 0}%` }} />
                                            </div>
                                            <div className="flex items-center gap-1 text-[9px] text-gray-300 font-mono">
                                                <Utensils size={10} className="text-orange-400" /> {comp.hunger || 0}%
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className={selectedCompanionId === comp.id ? "text-primary" : "text-gray-700"} />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Battle Loadout - 5 Slots */}
                    <section className="glass-panel p-4 pb-5 bg-[#0e0e11] border-gold/10">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold flex items-center gap-2">
                                <Sparkles size={12} />
                                Strategic Loadout (Max 8)
                            </h4>
                            <div className="text-[9px] text-gray-500 font-bold uppercase">
                                {equippedItems.length} / 8 Slots filled
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 relative">
                            {equipmentSlots.map((slot, i) => (
                                <div
                                    key={i}
                                    className={`
                                        aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all bg-black/40 relative group
                                        ${slot ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-white/20'}
                                        ${activeSlotIndex === i ? 'ring-2 ring-primary border-transparent' : ''}
                                    `}
                                    onClick={() => {
                                        setActiveSlotIndex(i);
                                        if (slot) {
                                            setShowActionPopover(true);
                                            setShowSelectionPopover(false);
                                        } else {
                                            setShowSelectionPopover(true);
                                            setShowActionPopover(false);
                                        }
                                    }}
                                >
                                    {slot ? (
                                        <>
                                            <div className="p-2 text-primary">
                                                {slot.effect?.type === 'freeze' ? <Snowflake size={20} className="text-cyan-400" /> :
                                                    slot.item_type === 'weapon' ? <Swords size={20} /> : <Shield size={20} />}
                                            </div>
                                            <div className="text-[7px] text-gray-400 font-bold uppercase truncate px-1 w-full text-center">{slot.name}</div>
                                        </>
                                    ) : (
                                        <div className="p-2 text-gray-700 group-hover:text-gray-400 transition-colors">
                                            <Package size={20} />
                                        </div>
                                    )}

                                    {/* Slot Action Popover (Change / Remove) */}
                                    {activeSlotIndex === i && showActionPopover && (
                                        <div className="absolute top-0 left-0 w-full h-full bg-black/90 rounded-lg flex flex-col items-center justify-center gap-1 z-50 p-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowSelectionPopover(true); setShowActionPopover(false); }}
                                                className="w-full py-1 text-[8px] font-bold uppercase bg-primary/20 text-primary rounded hover:bg-primary/30"
                                            >
                                                Change
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleToggleEquip(slot!.id); setActiveSlotIndex(null); }}
                                                className="w-full py-1 text-[8px] font-bold uppercase bg-red-900/20 text-red-500 rounded hover:bg-red-900/40"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Global Selection Popover */}
                            {(showSelectionPopover) && (
                                <div
                                    className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4"
                                    onClick={() => { setShowSelectionPopover(false); setActiveSlotIndex(null); }}
                                >
                                    <div
                                        className="glass-panel w-full max-w-lg max-h-[70vh] flex flex-col p-6 animate-in zoom-in duration-200"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="font-medieval text-gold text-lg flex items-center gap-2">
                                                <Package className="text-primary" />
                                                Select Battle Item
                                            </h4>
                                            <button
                                                onClick={() => { setShowSelectionPopover(false); setActiveSlotIndex(null); }}
                                                className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase"
                                            >
                                                Cancel ✕
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar grid grid-cols-2 lg:grid-cols-3 gap-3">
                                            {fullInventory
                                                .filter(i => i.item_type !== 'food' && !i.is_equipped)
                                                .map(item => {
                                                    const isFreezeItem = item.effect?.type === 'freeze';
                                                    const isHealItem = item.effect?.type === 'heal' || item.name.toLowerCase().includes('potion');
                                                    const disabled = (isFreezeItem && hasFreezing) || (isHealItem && hasHealing);

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => !disabled && handleToggleEquip(item.id).then(() => { setShowSelectionPopover(false); setActiveSlotIndex(null); })}
                                                            className={`
                                                                glass-panel p-3 transition-all border flex flex-col gap-2
                                                                ${disabled ? 'opacity-40 grayscale cursor-not-allowed border-white/5' : 'cursor-pointer border-white/5 hover:bg-white/10 hover:border-primary/30'}
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {isFreezeItem ? <Snowflake size={14} className="text-cyan-400" /> :
                                                                    item.item_type === 'weapon' ? <Swords size={12} className="text-primary" /> : <Shield size={12} className="text-secondary" />}
                                                                <span className="text-[10px] font-medieval text-white truncate">{item.name}</span>
                                                            </div>
                                                            <p className="text-[8px] text-gray-500 leading-tight line-clamp-2">{item.description}</p>
                                                            {disabled && (
                                                                <div className="text-[7px] text-red-400 font-bold uppercase mt-auto">
                                                                    Already have 1 {isFreezeItem ? 'Freeze' : 'Heal'} item
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            {fullInventory.filter(i => i.item_type !== 'food' && !i.is_equipped).length === 0 && (
                                                <div className="col-span-full py-12 text-center text-gray-600 uppercase tracking-widest text-[10px]">
                                                    No available items in storage
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Power Summary */}
                        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="text-[9px] uppercase font-bold text-gray-500">Total STR Bonus</div>
                                <div className="text-sm font-medieval text-red-500">+{totalBonusAtk}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-[9px] uppercase font-bold text-gray-500">Total DEF Bonus</div>
                                <div className="text-sm font-medieval text-blue-400">+{totalBonusDef}</div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Panel: Enemy/Lobby Info */}
                <div className="lg:col-span-7 flex flex-col min-h-0 relative">
                    {isEncounterMode ? (
                        <div className="glass-panel p-8 lg:p-12 flex flex-col items-center justify-center gap-8 border-red-500/20 bg-gradient-to-b from-red-950/10 to-transparent flex-1">
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-500 mb-2">Hostile Entities Detected</p>
                                <h3 className="text-3xl font-medieval text-white">{encounterContext.enemy_name}</h3>
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-[40px] animate-pulse-slow group-hover:bg-red-500/40 transition-all" />
                                <div className="w-40 h-40 bg-dark rounded-full flex items-center justify-center border-4 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.3)] relative z-10 transition-transform group-hover:scale-105">
                                    <span className="text-7xl">
                                        {encounterContext.enemy_type === 'Fire' ? '🔥' :
                                            encounterContext.enemy_type === 'Water' ? '💧' :
                                                encounterContext.enemy_type === 'Earth' ? '🗿' : '👹'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 text-center w-full max-w-sm">
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Combat Level</div>
                                    <div className="text-2xl font-medieval text-white flex items-center justify-center gap-2">
                                        <Skull size={18} className="text-red-500" />
                                        {encounterContext.enemy_level || 1}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Vitality</div>
                                    <div className="text-2xl font-medieval text-white flex items-center justify-center gap-2">
                                        <Heart size={18} className="text-emerald-500" />
                                        {encounterContext.enemy_hp}
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={selectedCompanionId === null || (selectedCompanion?.hp === 0) || isStarting}
                                onClick={handleStartEncounter}
                                className="w-full max-w-md btn-primary py-5 text-xl font-medieval shadow-glow-primary/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {isStarting ? 'Engaging Battle...' : 'COMMENCE ATTACK'}
                            </button>
                        </div>
                    ) : (
                        <div className="glass-panel p-8 lg:p-12 flex flex-col items-center justify-center gap-8 border-blue-500/10 bg-gradient-to-b from-blue-950/10 to-transparent flex-1">
                            <div className="text-center space-y-2">
                                <h3 className="text-3xl font-medieval text-white">The Great Arena</h3>
                                <p className="text-xs text-gray-500 max-w-md mx-auto uppercase tracking-widest leading-relaxed">
                                    Face the champions of other regions and claim your place in the high logs of history.
                                </p>
                            </div>

                            <div className="w-40 h-40 rounded-full bg-blue-500/5 flex items-center justify-center border border-blue-500/20 relative shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                                <Swords size={64} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                            </div>

                            <button
                                disabled={selectedCompanionId === null || (selectedCompanion?.hp === 0) || isStarting || isQueuing}
                                onClick={handleJoinQueue}
                                className="w-full max-w-md btn-gold py-5 text-xl font-medieval shadow-glow-gold/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                            >
                                <Zap className={`inline mr-3 ${isQueuing ? 'animate-spin' : ''}`} />
                                {isQueuing ? 'Seeking Challenger...' : 'ENTER PVP QUEUE'}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default BattleSelection;
