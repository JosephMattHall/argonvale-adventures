import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Shield, Sword, Zap, Flame, Snowflake, EyeOff, Coins, Sparkles, Info } from 'lucide-react';
import { renderStatBadges } from '../../utils/itemUtils';
import { useGameSocket } from '../../hooks/useGameSocket';
import { useUser } from '../../context/UserContext';
import type { Item } from '../../api/equipment';
import { soundManager } from '../../utils/SoundManager';

interface FloatingDamage {
    id: number;
    value: number | string;
    x: number;
    y: number;
    type: 'player' | 'enemy' | 'crit';
}

interface BattleContext {
    enemy_name: string;
    enemy_hp: number;
    enemy_max_hp: number;
    enemy_type: string;
    mode: 'pve' | 'pvp';
    enemy_image?: string;
    player_hp: number;
    player_max_hp: number;
    companion_id: number;
    companion_name: string;
    companion_image?: string;
    companion_stats: {
        str: number;
        def: number;
        spd: number;
    };
    equipped_items: Item[];
    resumed?: boolean;
}

const CombatView: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { profile } = useUser();
    const { sendCommand, messages } = useGameSocket();

    // Initial State
    const context: BattleContext = location.state?.battleContext || {
        enemy_name: "Training Dummy",
        enemy_hp: 50,
        enemy_max_hp: 50,
        enemy_type: "Normal",
        mode: "pve",
        player_hp: 100,
        player_max_hp: 100,
        companion_id: 0,
        companion_name: "Your Companion",
        companion_stats: { str: 10, def: 10, spd: 10 },
        equipped_items: []
    };

    const combatId = location.state?.combat_id || location.state?.combatId || "unknown";

    // Battle State
    const [playerHp, setPlayerHp] = useState(context.player_hp);
    const [playerMaxHp] = useState(context.player_max_hp);
    const [enemyHp, setEnemyHp] = useState(context.enemy_hp);
    const [logs, setLogs] = useState<string[]>(context.resumed ? ["Reconnected to active battle!"] : ["Battle Started!"]);
    const [isBattleOver, setIsBattleOver] = useState(false);
    const [result, setResult] = useState<"win" | "loss" | "draw" | null>(null);
    const [loot, setLoot] = useState<{ coins?: number, item?: any } | null>(null);

    // Status Effects
    const [turn, setTurn] = useState(1);
    const [playerFrozenUntil, setPlayerFrozenUntil] = useState(0);
    const [enemyFrozenUntil, setEnemyFrozenUntil] = useState(0);
    const [playerStealthUntil, setPlayerStealthUntil] = useState(0);
    const [enemyStealthUntil, setEnemyStealthUntil] = useState(0);

    // Turn Selection State
    const [currentStance, setCurrentStance] = useState<'normal' | 'berserk' | 'defensive'>('normal');
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [equippedItems] = useState<Item[]>(context.equipped_items);
    const [xpGained, setXpGained] = useState(0);
    const [usedItemIds, setUsedItemIds] = useState<number[]>([]);
    const [floatingDamage, setFloatingDamage] = useState<FloatingDamage[]>([]);
    const [playerAnimating, setPlayerAnimating] = useState<string | null>(null);
    const [enemyAnimating, setEnemyAnimating] = useState<string | null>(null);
    const processedMessageIds = React.useRef<Set<string>>(new Set());

    useEffect(() => {
        const newCombatEvents = messages.filter((m: any) =>
            (m.type === 'TurnProcessed' || m.type === 'CombatEnded') &&
            (m.combat_id === combatId || m.combatId === combatId) &&
            !processedMessageIds.current.has(m.event_id || m.eventId)
        );

        if (newCombatEvents.length > 0) {
            let lasthp = playerHp;
            let lastEnemyHp = enemyHp;
            let over = isBattleOver;
            let res = result;
            let xp = xpGained;
            let lootData = loot;

            newCombatEvents.forEach((msg: any) => {
                processedMessageIds.current.add(msg.event_id || msg.eventId);

                if (msg.type === 'TurnProcessed') {
                    setLogs(prev => [...prev, msg.description]);
                    setTurn(msg.turn_number);
                    setPlayerFrozenUntil(msg.player_frozen_until || 0);
                    setEnemyFrozenUntil(msg.enemy_frozen_until || 0);
                    setPlayerStealthUntil(msg.player_stealth_until || 0);
                    setEnemyStealthUntil(msg.enemy_stealth_until || 0);
                    if (msg.used_item_ids) setUsedItemIds(msg.used_item_ids);

                    // Logic For Visual Feedback
                    if (msg.damage_dealt > 0) {
                        const isPlayerAction = (msg.actor_id !== 0 && msg.actor_id === profile?.id) || (msg.actor_id !== 0 && context.mode !== 'pvp');
                        if (isPlayerAction) {
                            setEnemyAnimating('animate-shake animate-flash-red');
                            setTimeout(() => setEnemyAnimating(null), 500);
                            soundManager.play('hit');
                            addFloatingDamage(msg.damage_dealt, 'enemy', msg.description.includes('CRITICAL'));
                        } else {
                            setPlayerAnimating('animate-shake animate-flash-red');
                            setTimeout(() => setPlayerAnimating(null), 500);
                            soundManager.play('hit');
                            addFloatingDamage(msg.damage_dealt, 'player', msg.description.includes('CRITICAL'));
                        }
                    } else if (msg.description.includes('frozen')) {
                        soundManager.play('freeze');
                    } else if (msg.description.includes('invisible')) {
                        soundManager.play('stealth');
                    }

                    lasthp = msg.attacker_hp;
                    lastEnemyHp = msg.defender_hp;
                }
                if (msg.type === 'CombatEnded') {
                    over = true;
                    if (context.mode === 'pvp') {
                        if (msg.winner_id === profile?.id) res = 'win';
                        else if (msg.winner_id === 0) res = 'draw';
                        else res = 'loss';
                    } else {
                        res = (msg.winner_id !== 0) ? 'win' : 'loss';
                    }
                    xp = msg.xp_gained || 0;
                    lootData = { coins: msg.loot?.coins, item: msg.dropped_item };
                    if (res === 'win') soundManager.play('levelUp');
                }
            });

            setPlayerHp(lasthp);
            setEnemyHp(lastEnemyHp);
            setXpGained(xp);
            setLoot(lootData);
            if (over) {
                setIsBattleOver(true);
                setResult(res);
            }
        }
    }, [messages, combatId, profile?.id, context.mode]);

    const handleAttack = () => {
        if (isBattleOver || turn <= playerFrozenUntil) return;

        sendCommand({
            type: "CombatAction",
            combat_id: combatId,
            action_type: "attack",
            stance: currentStance,
            item_ids: selectedItems
        });

        setPlayerAnimating('animate-lunge-right');
        setTimeout(() => setPlayerAnimating(null), 400);
        soundManager.play('attack');
        setSelectedItems([]); // Reset selection
    };

    const addFloatingDamage = (val: number, type: 'player' | 'enemy', isCrit: boolean) => {
        const id = Date.now() + Math.random();
        const dmg: FloatingDamage = {
            id,
            value: isCrit ? `CRIT ${val}` : val,
            x: type === 'enemy' ? 70 + Math.random() * 10 : 20 + Math.random() * 10,
            y: 40 + Math.random() * 10,
            type: isCrit ? 'crit' : type
        };
        setFloatingDamage(prev => [...prev, dmg]);
        setTimeout(() => {
            setFloatingDamage(prev => prev.filter(d => d.id !== id));
        }, 1000);
    };

    const toggleItem = (id: number) => {
        if (selectedItems.includes(id)) {
            setSelectedItems(selectedItems.filter(wid => wid !== id));
        } else if (selectedItems.length < 2) {
            setSelectedItems([...selectedItems, id]);
        }
    };

    const isPlayerFrozen = turn <= playerFrozenUntil;
    const isEnemyFrozen = turn <= enemyFrozenUntil;
    const isPlayerStealthed = turn <= playerStealthUntil;
    const isEnemyStealthed = turn <= enemyStealthUntil;

    return (
        <div className="flex flex-col h-full gap-4 max-w-7xl mx-auto w-full overflow-y-auto pr-1 custom-scrollbar pb-24 lg:pb-0">
            {/* Battle Arena */}
            <div className="flex-none lg:flex-1 glass-panel relative p-3 sm:p-4 lg:p-8 flex flex-col md:flex-row justify-between items-center overflow-hidden min-h-[400px] md:min-h-[300px] gap-6 md:gap-0">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                <div className={`text-center z-10 transition-all duration-500 w-full md:w-auto ${playerAnimating} ${isPlayerStealthed ? 'opacity-40 brightness-150' : 'opacity-100'}`}>
                    <div className="relative group">
                        <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl mb-4 mx-auto border-2 flex items-center justify-center shadow-glow overflow-hidden relative ${isPlayerFrozen ? 'border-cyan-400 bg-cyan-950/40' : 'border-primary bg-primary/20'}`}>
                            {isPlayerFrozen && (
                                <div className="absolute inset-0 bg-cyan-400/20 backdrop-blur-[1px] animate-pulse z-30 flex items-center justify-center">
                                    <Snowflake className="text-cyan-200 animate-spin-slow" size={48} />
                                </div>
                            )}
                            {context.companion_image ? (
                                <img src={`/companions/${context.companion_image}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl sm:text-6xl">🐾</span>
                            )}
                            <div className="absolute -top-2 -right-2 flex flex-col gap-1 z-40">
                                {isPlayerStealthed && <div className="bg-purple-600 p-1.5 rounded-full border border-purple-400"><EyeOff size={14} className="text-white" /></div>}
                            </div>
                        </div>
                    </div>
                    <div className="font-medieval mb-2 text-primary text-xl tracking-wide uppercase">{context.companion_name}</div>
                    <div className="w-full sm:w-48 h-4 bg-black/60 rounded-full overflow-hidden mx-auto border border-white/10 p-0.5">
                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700" style={{ width: `${(playerHp / playerMaxHp) * 100}%` }} />
                    </div>
                    <div className="text-[10px] sm:text-xs mt-2 font-mono text-white font-bold">{playerHp} / {playerMaxHp} HP</div>
                </div>

                <div className="absolute inset-0 pointer-events-none z-50">
                    {floatingDamage.map(dmg => (
                        <div key={dmg.id} className={`absolute animate-float-up font-bold text-3xl ${dmg.type === 'enemy' ? 'text-red-500' : dmg.type === 'crit' ? 'text-gold italic scale-125' : 'text-neutral-200'}`} style={{ left: `${dmg.x}%`, top: `${dmg.y}%` }}>{dmg.value}</div>
                    ))}
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="text-4xl md:text-6xl font-medieval text-gold animate-pulse">VS</div>
                    <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Turn {turn}</div>
                </div>

                <div className={`text-center z-10 transition-all duration-500 w-full md:w-auto ${enemyAnimating} ${isEnemyStealthed ? 'opacity-40 brightness-150' : 'opacity-100'}`}>
                    <div className="relative group">
                        <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl mb-4 mx-auto border-2 flex items-center justify-center overflow-hidden relative ${isEnemyFrozen ? 'border-cyan-400 bg-cyan-950/40' : 'border-red-500/50 bg-red-500/20'}`}>
                            {isEnemyFrozen && (
                                <div className="absolute inset-0 bg-cyan-400/20 backdrop-blur-[1px] animate-pulse z-30 flex items-center justify-center">
                                    <Snowflake className="text-cyan-200 animate-spin-slow" size={48} />
                                </div>
                            )}
                            {context.enemy_image ? (
                                <img src={context.enemy_image.startsWith('/') ? context.enemy_image : `/companions/${context.enemy_image}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl sm:text-6xl text-red-500">👹</span>
                            )}
                            <div className="absolute -top-2 -left-2 flex flex-col gap-1 z-40">
                                {isEnemyStealthed && <div className="bg-purple-600 p-1.5 rounded-full border border-purple-400"><EyeOff size={14} className="text-white" /></div>}
                            </div>
                        </div>
                    </div>
                    <div className="font-medieval mb-2 text-red-500 text-xl tracking-wide uppercase">
                        {context.mode === 'pvp' ? (
                            <Link to={`/game/profile/${context.enemy_name}`} className="hover:text-gold transition-colors">
                                {context.enemy_name}
                            </Link>
                        ) : context.enemy_name}
                    </div>
                    <div className="w-full sm:w-48 h-4 bg-black/60 rounded-full overflow-hidden mx-auto border border-white/10 p-0.5">
                        <div className="h-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-700" style={{ width: `${(enemyHp / context.enemy_max_hp) * 100}%` }} />
                    </div>
                    <div className="text-[10px] sm:text-xs mt-2 font-mono text-red-400 font-bold">{enemyHp} / {context.enemy_max_hp} HP</div>
                </div>
            </div>

            {/* Strategy & Gear Bar */}
            <div className="flex-none flex flex-col lg:flex-row gap-4 lg:h-72">
                {!isBattleOver ? (
                    <>
                        <div className="glass-panel w-full lg:w-48 p-4 flex flex-row lg:flex-col gap-2">
                            <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Stance</div>
                            {(['normal', 'berserk', 'defensive'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setCurrentStance(s)}
                                    disabled={isPlayerFrozen}
                                    className={`flex-1 flex flex-col items-center justify-center rounded-lg border transition-all p-2 ${currentStance === s ? 'border-primary bg-primary/20' : 'border-white/5 hover:bg-white/5'}`}
                                >
                                    {s === 'normal' ? <Zap size={16} /> : s === 'berserk' ? <Flame size={16} /> : <Shield size={16} />}
                                    <span className="text-[10px] font-bold mt-1 capitalize">{s}</span>
                                </button>
                            ))}
                        </div>

                        <div className={`glass-panel flex-1 p-4 flex flex-col relative ${isPlayerFrozen ? 'opacity-50 grayscale' : ''}`}>
                            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                                <div className="text-[10px] font-bold tracking-widest uppercase text-white/60">Choose 2 Actions</div>
                                <div className="text-[10px] font-mono text-gold px-2 py-0.5 rounded bg-black/40 border border-gold/20">{selectedItems.length}/2</div>
                            </div>

                            <div className="flex-1 flex gap-3 items-center">
                                <div className="flex-1 grid grid-cols-4 lg:grid-cols-8 gap-2">
                                    {equippedItems.map(item => {
                                        const isSelected = selectedItems.includes(item.id);
                                        const isSpent = usedItemIds.includes(item.id);
                                        const isWeapon = item.item_type === 'weapon';
                                        const isShield = item.item_type === 'shield';

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => !isPlayerFrozen && !isSpent && toggleItem(item.id)}
                                                className={`aspect-square rounded-lg border flex flex-col items-center justify-center transition-all p-1 relative group/battleitem ${isSpent ? 'opacity-20 grayscale border-white/5 cursor-not-allowed' : isSelected ? 'border-primary bg-primary/20 scale-105 z-10 cursor-pointer' : 'border-white/5 bg-black/20 hover:bg-white/5 cursor-pointer'}`}
                                            >
                                                {isShield ? <Shield size={18} /> : isWeapon ? <Sword size={18} /> : <Sparkles size={18} className="text-emerald-400" />}
                                                <div className="text-[7px] text-gray-400 font-bold uppercase truncate px-1 w-full text-center mt-1">{item.name}</div>

                                                {/* Combat Tooltip */}
                                                {!isSpent && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover/battleitem:block z-[100] pointer-events-none">
                                                        <div className="bg-black/95 border border-primary/30 rounded-lg p-3 text-[10px] text-white shadow-2xl backdrop-blur-md">
                                                            <div className="text-primary uppercase font-bold mb-1 flex items-center gap-2">
                                                                <Info size={12} /> {item.name}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1 mb-2">
                                                                {renderStatBadges(item)}
                                                            </div>
                                                            <p className="text-gray-400 italic text-[8px] leading-tight">
                                                                {item.description || "Ancient battle gear."}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {!isSpent && item.effect?.type && (
                                                    <div className="absolute top-1 right-1">
                                                        {item.effect.type === 'freeze' ? <Snowflake size={8} className="text-cyan-400" /> : <EyeOff size={8} className="text-purple-400" />}
                                                    </div>
                                                )}
                                                {isSpent && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full h-[1px] bg-red-500/50 rotate-45" /></div>}
                                            </div>
                                        );
                                    })}
                                    {[...Array(Math.max(0, 8 - equippedItems.length))].map((_, i) => (
                                        <div key={i} className="aspect-square rounded-lg border border-dashed border-white/5 flex items-center justify-center bg-black/10"><div className="w-1.5 h-1.5 rounded-full bg-white/5" /></div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleAttack}
                                    disabled={selectedItems.length === 0 || isPlayerFrozen}
                                    className="h-full px-6 btn-primary rounded-xl flex flex-col items-center justify-center gap-1 hover:scale-105 transition-all disabled:opacity-50 min-w-[100px]"
                                >
                                    <Sword size={24} />
                                    <span className="font-medieval font-bold text-xs tracking-widest uppercase">Strike</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to forfeit? This will count as a loss.")) {
                                            sendCommand({
                                                type: "ForfeitCombat",
                                                combat_id: combatId
                                            });
                                        }
                                    }}
                                    className="h-full px-4 border border-red-500/30 hover:bg-red-500/10 text-red-500 rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
                                >
                                    <span className="text-xl">🏳️</span>
                                    <span className="font-medieval font-bold text-[10px] tracking-widest uppercase">Forfeit</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="glass-panel flex-1 p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 bg-primary/5 border-primary/30">
                        <div className="flex flex-col lg:flex-row items-center gap-8 w-full">
                            <div className="flex items-center gap-6 text-left">
                                <div className="text-6xl">{result === 'win' ? '🏆' : result === 'draw' ? '🤝' : '💀'}</div>
                                <div>
                                    <h2 className={`text-4xl font-medieval ${result === 'win' ? 'text-gold' : result === 'draw' ? 'text-blue-400' : 'text-red-500'}`}>
                                        {result === 'win' ? 'VICTORY!' : result === 'draw' ? 'DRAW' : 'DEFEAT'}
                                    </h2>
                                    {result === 'win' && <div className="text-gold font-bold">+{xpGained} XP</div>}
                                </div>
                            </div>
                            <div className="flex-1">
                                {result === 'win' && loot && (
                                    <div className="glass-panel p-3 bg-black/40 border-gold/20 flex flex-wrap gap-4 items-center">
                                        <div className="text-[10px] uppercase font-bold text-gray-500 w-full mb-1">Loot Found</div>
                                        {loot.coins && <div className="flex items-center gap-2"><Coins size={14} className="text-gold" /><span className="text-gold font-bold text-sm">{loot.coins}</span></div>}
                                        {loot.item && <div className="flex items-center gap-2"><Sparkles size={14} className="text-primary" /><span className="text-white text-sm">{loot.item.name}</span></div>}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    const origin = location.state?.origin;
                                    if (origin === 'exploration') navigate('/game/explore');
                                    else if (origin === 'messages') navigate('/game/messages');
                                    else navigate('/game/battle-select');
                                }}
                                className="btn-primary px-8 py-3 text-lg"
                            >
                                {location.state?.origin === 'exploration' ? 'Continue' : 'Return'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="glass-panel w-full lg:w-80 p-4 overflow-y-auto font-mono text-[10px] flex flex-col-reverse custom-scrollbar h-48 lg:h-auto">
                    <div className="flex flex-col-reverse">
                        {logs.map((l, i) => (
                            <div key={i} className="mb-2 pb-2 border-b border-white/5 last:border-0 text-gray-400">{l}</div>
                        ))}
                    </div>
                    <div className="text-[8px] font-bold uppercase text-gray-500 mb-4 sticky top-0 bg-[#0a0a0c] pb-2 border-b border-white/10 z-10">Combat Log</div>
                </div>
            </div>
        </div>
    );
};

export default CombatView;
