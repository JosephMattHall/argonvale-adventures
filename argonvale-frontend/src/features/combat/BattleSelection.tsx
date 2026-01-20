import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { profilesApi, type Companion } from '../../api/profiles';
import { equipmentApi, type Item } from '../../api/equipment';
import { useGameSocket } from '../../hooks/useGameSocket';
import { Swords, Zap, Shield, Skull, Package, Sparkles, ChevronRight, Snowflake } from 'lucide-react';

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
        <div className="h-full flex flex-col p-3 lg:p-6 overflow-y-auto custom-scrollbar bg-black text-white relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05),transparent)] pointer-events-none" />
            {/* Header */}
            <header className="flex justify-between items-center mb-4 lg:mb-8 shrink-0 relative z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white/5 rounded-lg border border-white/5 transition-colors group"
                    >
                        <ChevronRight className="rotate-180 text-gray-500 group-hover:text-white" size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl lg:text-3xl font-medieval text-gold flex items-center gap-3 leading-none">
                            <Swords className="text-primary" size={24} />
                            {isEncounterMode ? 'Battle Order' : 'The Arena'}
                        </h2>
                        <div className="text-[8px] lg:text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Prepare your forces for glory</div>
                    </div>
                </div>
                {isEncounterMode && (
                    <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-[8px] lg:text-[10px] text-red-500 font-bold uppercase tracking-widest">
                        Objective Identified
                    </div>
                )}
            </header>

            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Left Panel: Hero Selection & Setup */}
                <div className="lg:col-span-5 flex flex-col gap-4 lg:gap-6 min-h-0">
                    <section className="flex-none lg:flex-1 overflow-visible">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Active Roster</h3>
                            <span className="text-[9px] text-gray-600 font-bold uppercase">{companions.length} Available</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                            {companions.map(comp => (
                                <div
                                    key={comp.id}
                                    onClick={() => setSelectedCompanionId(comp.id)}
                                    className={`
                                        glass-panel p-2 lg:p-3 cursor-pointer transition-all flex items-center gap-3 border group/item
                                        ${selectedCompanionId === comp.id ? 'border-primary bg-primary/10 shadow-glow-primary/5' : 'border-white/5 hover:border-white/10 hover:bg-white/5'}
                                    `}
                                >
                                    <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-lg flex items-center justify-center overflow-hidden border transition-all ${selectedCompanionId === comp.id ? 'border-primary/50' : 'border-white/10 bg-black/40'}`}>
                                        <img src={`/companions/${comp.image_url}`} alt="" className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-medieval text-white text-xs lg:text-sm truncate pr-2">{comp.name}</span>
                                            <span className="text-[8px] lg:text-[10px] text-gray-500 font-bold shrink-0">L{comp.level}</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1 bg-black/60 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-red-600 to-red-400" style={{ width: `${(comp.hp / comp.max_hp) * 100}%` }} />
                                                </div>
                                                <span className="text-[8px] font-mono text-red-500 font-bold w-4">{comp.hp}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1 bg-black/60 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400" style={{ width: `${comp.hunger || 0}%` }} />
                                                </div>
                                                <span className="text-[8px] font-mono text-orange-400 font-bold w-4">{comp.hunger || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className={`transition-transform ${selectedCompanionId === comp.id ? "text-primary translate-x-1" : "text-gray-800"}`} />
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="glass-panel p-3 lg:p-5 bg-[#0e0e11] border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                        <div className="flex justify-between items-center mb-3 lg:mb-5 relative z-10">
                            <h4 className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] text-gold flex items-center gap-2 font-medieval">
                                <Sparkles size={14} className="text-primary" />
                                Battle Loadout
                            </h4>
                            <div className="text-[8px] lg:text-[9px] text-gray-500 font-bold uppercase tracking-tighter">
                                {equippedItems.length} / 8 Equipped
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
                        <div className="mt-4 pt-4 border-t border-white/5 flex gap-6 relative z-10">
                            <div className="flex items-center gap-2">
                                <Swords size={12} className="text-red-500" />
                                <div>
                                    <div className="text-[8px] uppercase font-bold text-gray-500 leading-none mb-1">Offense</div>
                                    <div className="text-xs lg:text-sm font-medieval text-white">+{totalBonusAtk}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield size={12} className="text-blue-400" />
                                <div>
                                    <div className="text-[8px] uppercase font-bold text-gray-500 leading-none mb-1">Defense</div>
                                    <div className="text-xs lg:text-sm font-medieval text-white">+{totalBonusDef}</div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Panel: Enemy/Lobby Info */}
                <div className="lg:col-span-7 flex flex-col min-h-[400px] lg:min-h-0">
                    {isEncounterMode ? (
                        <div className="glass-panel p-6 lg:p-12 flex flex-col items-center justify-center gap-6 lg:gap-10 border-red-500/10 bg-gradient-to-b from-red-950/20 via-transparent to-transparent flex-1 relative overflow-hidden group">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

                            <div className="text-center relative z-10">
                                <div className="flex items-center justify-center gap-2 mb-3 bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20 mx-auto w-fit">
                                    <Skull size={14} className="text-red-500 animate-pulse" />
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 leading-none">High Threat Level</p>
                                </div>
                                <h3 className="text-2xl lg:text-5xl font-medieval text-white lg:tracking-tight group-hover:scale-105 transition-transform duration-700">{encounterContext.enemy_name}</h3>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500/10 rounded-full blur-[80px] animate-pulse-slow scale-150" />
                                <div className="w-32 h-32 lg:w-56 lg:h-56 bg-black/40 rounded-full flex items-center justify-center border-2 lg:border-4 border-red-500/20 shadow-2xl relative z-10 overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.2),transparent_70%)]" />
                                    <span className="text-6xl lg:text-9xl relative drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                        {encounterContext.enemy_type === 'Fire' ? '🔥' :
                                            encounterContext.enemy_type === 'Water' ? '💧' :
                                                encounterContext.enemy_type === 'Earth' ? '🗿' : '👹'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 lg:gap-20 text-center relative z-10">
                                <div className="space-y-1">
                                    <div className="text-[10px] lg:text-xs uppercase font-bold text-red-900 tracking-widest">Enemy LvL</div>
                                    <div className="text-xl lg:text-4xl font-medieval text-white tabular-nums">{encounterContext.enemy_level || 1}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] lg:text-xs uppercase font-bold text-red-900 tracking-widest">Resistance</div>
                                    <div className="text-xl lg:text-4xl font-medieval text-white tabular-nums">{encounterContext.enemy_hp} HP</div>
                                </div>
                            </div>

                            <button
                                disabled={selectedCompanionId === null || (selectedCompanion?.hp === 0) || isStarting}
                                onClick={handleStartEncounter}
                                className="w-full max-w-sm btn-red-battle py-4 lg:py-6 text-xl lg:text-2xl font-medieval relative z-10 group/btn"
                            >
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                {isStarting ? 'Summoning Forces...' : 'STRIKE TARGET'}
                            </button>
                        </div>
                    ) : (
                        <div className="glass-panel p-6 lg:p-12 flex flex-col items-center justify-center gap-8 lg:gap-12 border-blue-500/10 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent flex-1 relative overflow-hidden group">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

                            <div className="text-center space-y-3 relative z-10">
                                <h3 className="text-2xl lg:text-5xl font-medieval text-white lg:tracking-tight group-hover:scale-105 transition-transform duration-700">The Grand Arena</h3>
                                <p className="text-[10px] lg:text-[11px] text-gray-500 max-w-xs mx-auto uppercase tracking-[0.3em] font-bold leading-relaxed opacity-60">
                                    Challenge the legends of Argonvale and rise to glory
                                </p>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[80px] animate-pulse-slow scale-150" />
                                <div className="w-32 h-32 lg:w-56 lg:h-56 bg-black/40 rounded-full flex items-center justify-center border-2 lg:border-4 border-blue-500/20 shadow-2xl relative z-10">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_70%)]" />
                                    <Swords size={60} className="text-blue-400 group-hover:rotate-12 transition-transform duration-500" />
                                </div>
                            </div>

                            <button
                                disabled={selectedCompanionId === null || (selectedCompanion?.hp === 0) || isStarting || isQueuing}
                                onClick={handleJoinQueue}
                                className="w-full max-w-sm btn-blue-battle py-4 lg:py-6 text-xl lg:text-2xl font-medieval relative z-10 group/btn"
                            >
                                {isQueuing ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <Zap className="animate-spin text-blue-300" size={24} />
                                        <span>Searching...</span>
                                    </div>
                                ) : 'JOIN PVP QUEUE'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BattleSelection;
