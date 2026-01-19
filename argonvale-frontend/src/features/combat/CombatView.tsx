import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, Sword, Zap, Flame } from 'lucide-react';
import { useGameSocket } from '../../hooks/useGameSocket';
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
}

const CombatView: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { sendCommand, messages } = useGameSocket();

    // Initial State
    const context: BattleContext = location.state?.battleContext || {
        enemy_name: "Training Dummy",
        enemy_hp: 50,
        enemy_max_hp: 50,
        enemy_type: "Normal",
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
    const [logs, setLogs] = useState<string[]>(["Battle Started!"]);
    const [isBattleOver, setIsBattleOver] = useState(false);
    const [result, setResult] = useState<"win" | "loss" | null>(null);

    // Turn Selection State
    const [currentStance, setCurrentStance] = useState<'normal' | 'berserk' | 'defensive'>('normal');
    const [selectedWeapons, setSelectedWeapons] = useState<number[]>([]);
    const [equippedItems] = useState<Item[]>(context.equipped_items);
    const [activeTab, setActiveTab] = useState<'weapons' | 'items'>('weapons');
    const [xpGained, setXpGained] = useState(0);
    const [floatingDamage, setFloatingDamage] = useState<FloatingDamage[]>([]);
    const [playerAnimating, setPlayerAnimating] = useState<string | null>(null);
    const [enemyAnimating, setEnemyAnimating] = useState<string | null>(null);

    useEffect(() => {
        const combatEvents = messages.filter((m: any) =>
            m.type === 'TurnProcessed' || m.type === 'CombatEnded'
        );

        if (combatEvents.length > 0) {
            const newLogs = ["Battle Started!"];
            let lasthp = context.player_hp;
            let lastEnemyHp = context.enemy_hp;
            let over = false;
            let res: "win" | "loss" | null = null;
            let xp = 0;

            combatEvents.forEach((msg: any) => {
                if (msg.type === 'TurnProcessed') {
                    newLogs.push(msg.description);

                    // Logic For Visual Feedback
                    if (msg.damage_dealt > 0) {
                        const isEnemyHit = msg.actor_id !== 0; // If actor is user (not 0), enemy is hit
                        if (isEnemyHit) {
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
                    } else if (msg.description.includes('block') || msg.description.includes('defensive')) {
                        const isEnemyBlock = msg.actor_id !== 0; // If actor is user, enemy blocks (or user blocks?)
                        // Wait, if actor_id is user (1), the enemy is the one being attacked. 
                        // If it's a block, the defender is blocking.
                        if (isEnemyBlock) {
                            setEnemyAnimating('animate-block-shake');
                            setTimeout(() => setEnemyAnimating(null), 500);
                        } else {
                            setPlayerAnimating('animate-block-shake');
                            setTimeout(() => setPlayerAnimating(null), 500);
                        }
                        soundManager.play('block');
                    } else if (msg.description.includes('restore') || msg.description.includes('heal')) {
                        const isEnemyHeal = msg.actor_id === 0;
                        if (isEnemyHeal) {
                            setEnemyAnimating('animate-heal-pulse');
                            setTimeout(() => setEnemyAnimating(null), 800);
                        } else {
                            setPlayerAnimating('animate-heal-pulse');
                            setTimeout(() => setPlayerAnimating(null), 800);
                        }
                    }

                    // Trigger lunges for actors
                    if (msg.actor_id === 0 && (msg.damage_dealt > 0 || msg.description.includes('attack'))) {
                        setEnemyAnimating(prev => prev ? `${prev} animate-lunge-left` : 'animate-lunge-left');
                        setTimeout(() => setEnemyAnimating(null), 400);
                    }

                    lasthp = msg.attacker_hp;
                    lastEnemyHp = msg.defender_hp;
                }
                if (msg.type === 'CombatEnded') {
                    over = true;
                    res = (msg.winner_id !== 0) ? 'win' : 'loss';
                    xp = msg.xp_gained || 0;
                    if (res === 'win') soundManager.play('levelUp');
                }
            });

            setLogs(newLogs);
            setPlayerHp(lasthp);
            setEnemyHp(lastEnemyHp);
            setXpGained(xp);
            if (over) {
                setIsBattleOver(true);
                setResult(res);
            }
        }
    }, [messages, context.enemy_hp, context.player_hp]);

    const handleAttack = () => {
        if (isBattleOver) return;

        sendCommand({
            type: "CombatAction",
            combat_id: combatId,
            actor_id: 1,
            action_type: "attack",
            stance: currentStance,
            weapon_ids: selectedWeapons
        });
        setPlayerAnimating('animate-lunge-right');
        setTimeout(() => setPlayerAnimating(null), 400);
        soundManager.play('attack');
    };

    const addFloatingDamage = (val: number, type: 'player' | 'enemy', isCrit: boolean) => {
        const id = Date.now();
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

    const handleUseItem = (itemId: number) => {
        if (isBattleOver) return;

        sendCommand({
            type: "CombatAction",
            combat_id: combatId,
            actor_id: 1,
            action_type: "use_item",
            item_id: itemId
        });
        setPlayerAnimating('animate-heal-pulse');
        setTimeout(() => setPlayerAnimating(null), 800);
    };

    const toggleWeapon = (id: number) => {
        if (selectedWeapons.includes(id)) {
            setSelectedWeapons(selectedWeapons.filter(wid => wid !== id));
        } else if (selectedWeapons.length < 2) {
            setSelectedWeapons([...selectedWeapons, id]);
        }
    };

    if (isBattleOver) {
        return (
            <div className="h-full flex flex-col items-center justify-center glass-panel animate-in fade-in zoom-in duration-500">
                <div className="text-8xl mb-6 shadow-glow p-8 rounded-full bg-primary/10">
                    {result === 'win' ? '🏆' : '💀'}
                </div>
                <h1 className={`text-6xl font-medieval mb-2 ${result === 'win' ? 'text-gold' : 'text-red-500'}`}>
                    {result === 'win' ? 'VICTORY!' : 'DEFEAT'}
                </h1>
                {result === 'win' && (
                    <div className="bg-primary/20 px-6 py-2 rounded-full border border-primary/30 text-gold font-bold mb-6 animate-pulse">
                        +{xpGained} XP GAINED
                    </div>
                )}
                <p className="text-xl text-gray-400 mb-8 max-w-md text-center">
                    {result === 'win' ? 'Your companion proved its worth and gathered spoils!' : 'Your companion was overpowered. Regroup and try again.'}
                </p>
                <button
                    onClick={() => navigate('/game/battle-select')}
                    className="btn-primary px-12 py-4 text-xl hover:scale-105 transition-transform"
                >
                    Return to Arena
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4 max-w-7xl mx-auto w-full overflow-y-auto pr-1 custom-scrollbar pb-24 lg:pb-0">
            {/* Battle Arena */}
            <div className="flex-none lg:flex-1 glass-panel relative p-4 lg:p-8 flex flex-col md:flex-row justify-between items-center overflow-hidden min-h-[300px]">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                {/* Player Side */}
                <div className={`text-center z-10 transition-all duration-300 ${playerAnimating}`}>
                    <div className="relative group">
                        <div className="w-32 h-32 bg-primary/20 rounded-2xl mb-4 mx-auto border-2 border-primary flex items-center justify-center shadow-glow overflow-hidden relative">
                            {/* Inner Glow/Aura */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-primary/20 animate-pulse" />
                            {context.companion_image ? (
                                <img src={`/companions/${context.companion_image}`} alt="" className="w-full h-full object-cover z-10" />
                            ) : (
                                <span className="text-6xl z-10 transition-transform group-hover:scale-110 duration-500">🐾</span>
                            )}
                            {/* Elemental Overlay based on name or type if available */}
                            <div className="absolute bottom-1 right-1 bg-dark/80 rounded-full p-1 border border-primary/30 z-20">
                                <Zap size={14} className="text-gold" />
                            </div>
                        </div>
                    </div>
                    <div className="font-medieval mb-2 text-primary text-2xl tracking-wide uppercase">
                        {context.companion_name}
                    </div>
                    <div className="w-48 h-5 bg-black/60 rounded-full overflow-hidden mx-auto border border-white/10 p-0.5">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700 ease-out rounded-full"
                            style={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
                        />
                    </div>
                    <div className="text-sm mt-2 font-mono text-white font-bold">{playerHp} / {playerMaxHp} HP</div>
                </div>

                {/* VS Center & Floating Damage Overlay */}
                <div className="absolute inset-0 pointer-events-none z-50">
                    {floatingDamage.map(dmg => (
                        <div
                            key={dmg.id}
                            className={`absolute animate-float-up font-bold text-3xl drop-shadow-md select-none ${dmg.type === 'enemy' ? 'text-red-500' :
                                dmg.type === 'crit' ? 'text-gold text-5xl italic scale-125' : 'text-neutral-200'
                                }`}
                            style={{ left: `${dmg.x}%`, top: `${dmg.y}%` }}
                        >
                            {dmg.value}
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center gap-2 lg:gap-4 order-first md:order-none mb-6 md:mb-0">
                    <div className="text-2xl md:text-4xl font-black italic tracking-tighter text-white/5 uppercase select-none">Argonvale Fight</div>
                    <div className="text-4xl md:text-6xl font-medieval text-gold animate-bounce drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">VS</div>
                    <div className="text-[10px] md:text-xs font-bold text-gray-500 tracking-[0.3em] uppercase">Turn {logs.length}</div>
                </div>

                {/* Enemy Side */}
                <div className={`text-center z-10 transition-all duration-300 ${enemyAnimating}`}>
                    <div className="relative group">
                        <div className="w-32 h-32 bg-red-500/20 rounded-2xl mb-4 mx-auto border-2 border-red-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)] overflow-hidden relative">
                            {/* Inner Glow/Aura */}
                            <div className="absolute inset-0 bg-gradient-to-bl from-red-500/20 via-transparent to-red-500/20 animate-pulse" />
                            {context.enemy_image ? (
                                <img src={context.enemy_image.startsWith('/') ? context.enemy_image : `/companions/${context.enemy_image}`} alt="" className="w-full h-full object-cover z-10" />
                            ) : (
                                <span className="text-6xl z-10 transition-transform group-hover:scale-110 duration-500">
                                    {context.enemy_type === 'Fire' ? '🔥' :
                                        context.enemy_type === 'Water' ? '💧' :
                                            context.enemy_type === 'Earth' ? '🗿' : '👹'}
                                </span>
                            )}
                            {/* Elemental Overlay */}
                            <div className="absolute top-1 left-1 bg-dark/80 rounded-full p-1 border border-red-500/30 z-20">
                                <Flame size={14} className="text-red-400" />
                            </div>
                        </div>
                    </div>
                    <div className="font-medieval mb-2 text-red-500 text-2xl tracking-wide uppercase">{context.enemy_name}</div>
                    <div className="w-48 h-5 bg-black/60 rounded-full overflow-hidden mx-auto border border-white/10 p-0.5">
                        <div
                            className="h-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-700 ease-out rounded-full"
                            style={{ width: `${(enemyHp / context.enemy_max_hp) * 100}%` }}
                        />
                    </div>
                    <div className="text-sm mt-2 font-mono text-red-400 font-bold">{enemyHp} / {context.enemy_max_hp} HP</div>
                </div>
            </div>

            {/* Strategy & Gear Bar */}
            <div className="flex-none flex flex-col lg:flex-row gap-4 lg:h-72">
                {/* 1. Stance Selection */}
                <div className="glass-panel w-full lg:w-48 p-4 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
                    <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Combat Stance</div>
                    <button
                        onClick={() => setCurrentStance('normal')}
                        className={`flex-1 flex flex-col items-center justify-center rounded-lg border transition-all ${currentStance === 'normal' ? 'border-gold bg-gold/10' : 'border-white/5 hover:bg-white/5'}`}
                    >
                        <Zap size={18} className={currentStance === 'normal' ? 'text-gold' : 'text-gray-400'} />
                        <span className="text-xs mt-1 font-bold">Normal</span>
                    </button>
                    <button
                        onClick={() => setCurrentStance('berserk')}
                        className={`flex-1 flex flex-col items-center justify-center rounded-lg border transition-all ${currentStance === 'berserk' ? 'border-red-500 bg-red-500/10' : 'border-white/5 hover:bg-white/5'}`}
                    >
                        <Flame size={18} className={currentStance === 'berserk' ? 'text-red-500' : 'text-gray-400'} />
                        <span className="text-xs mt-1 font-bold">Berserk</span>
                    </button>
                    <button
                        onClick={() => setCurrentStance('defensive')}
                        className={`flex-1 flex flex-col items-center justify-center rounded-lg border transition-all ${currentStance === 'defensive' ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 hover:bg-white/5'}`}
                    >
                        <Shield size={18} className={currentStance === 'defensive' ? 'text-blue-500' : 'text-gray-400'} />
                        <span className="text-xs mt-1 font-bold">Defend</span>
                    </button>
                </div>

                {/* 2. Equipped Gear & Attack / Items */}
                <div className="glass-panel flex-1 p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setActiveTab('weapons')}
                                className={`text-[10px] font-bold tracking-widest uppercase pb-1 border-b-2 transition-all ${activeTab === 'weapons' ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                            >
                                Weapons
                            </button>
                            <button
                                onClick={() => setActiveTab('items')}
                                className={`text-[10px] font-bold tracking-widest uppercase pb-1 border-b-2 transition-all ${activeTab === 'items' ? 'border-primary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                            >
                                Items
                            </button>
                        </div>
                        <div className="text-[10px] font-mono text-gold">
                            {activeTab === 'weapons' ? `${selectedWeapons.length}/2 Picked` : 'Consumables'}
                        </div>
                    </div>

                    <div className="flex-1 flex gap-2 items-center">
                        <div className="flex-1 grid grid-cols-4 lg:grid-cols-8 gap-2">
                            {activeTab === 'weapons' ? (
                                <>
                                    {equippedItems.filter(i => i.item_type !== 'potion').map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleWeapon(item.id)}
                                            className={`
                                                aspect-square rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all p-1
                                                ${selectedWeapons.includes(item.id) ? 'border-primary bg-primary/20 scale-105 shadow-glow z-10' : 'border-white/5 bg-black/20 hover:bg-white/5'}
                                            `}
                                        >
                                            <Sword size={20} className={selectedWeapons.includes(item.id) ? 'text-primary' : 'opacity-50'} />
                                            <div className="text-[7px] text-gray-400 font-bold uppercase truncate px-1 w-full text-center mt-1">{item.name}</div>
                                            <div className="flex gap-1 mt-1">
                                                {(Object.entries(item.stats?.atk || {}) as [string, number][]).map(([type, val]) => (
                                                    <span key={type} className="text-[6px] px-1 bg-primary/20 rounded text-primary font-bold">
                                                        {val} {type[0].toUpperCase()}
                                                    </span>
                                                ))}
                                                {(Object.entries(item.stats?.def || {}) as [string, number][]).map(([type, val]) => (
                                                    <span key={type} className="text-[6px] px-1 bg-blue-500/20 rounded text-blue-400 font-bold">
                                                        {val} D
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {[...Array(Math.max(0, 8 - equippedItems.filter(i => i.item_type !== 'potion').length))].map((_, i) => (
                                        <div key={i} className="aspect-square rounded-lg border border-dashed border-white/5 flex items-center justify-center bg-black/10">
                                            <div className="w-2 h-2 rounded-full bg-white/5" />
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <>
                                    {equippedItems.filter(i => i.item_type === 'potion').map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => handleUseItem(item.id)}
                                            className="aspect-square rounded-lg border border-white/5 bg-black/20 hover:bg-primary/20 hover:border-primary cursor-pointer transition-all flex flex-col items-center justify-center group"
                                        >
                                            <Zap size={24} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                            <div className="text-[8px] text-gray-400 font-bold uppercase truncate px-1 w-full text-center mt-1">{item.name}</div>
                                        </div>
                                    ))}
                                    {[...Array(Math.max(0, 8 - equippedItems.filter(i => i.item_type === 'potion').length))].map((_, i) => (
                                        <div key={i} className="aspect-square rounded-lg border border-dashed border-white/5 flex items-center justify-center bg-black/10">
                                            <div className="w-2 h-2 rounded-full bg-white/5" />
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        {activeTab === 'weapons' && (
                            <button
                                onClick={handleAttack}
                                disabled={selectedWeapons.length === 0}
                                className="h-full aspect-square btn-primary rounded-xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
                            >
                                <Sword size={32} className="group-hover:rotate-12 transition-transform" />
                                <span className="font-medieval font-bold text-lg tracking-widest">STRIKE</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. Combat Log */}
                <div className="glass-panel w-full lg:w-80 p-4 overflow-y-auto font-mono text-[10px] flex flex-col-reverse custom-scrollbar h-48 lg:h-auto">
                    <div className="flex flex-col-reverse">
                        {logs.map((log, i) => (
                            <div key={i} className={`mb-2 pb-2 border-b border-white/5 last:border-0 ${log.includes('deal') ? 'text-primary' : log.includes('back') ? 'text-red-400' : 'text-gray-400'}`}>
                                {log}
                            </div>
                        ))}
                    </div>
                    <div className="text-[var(--text-secondary)] text-[8px] font-bold uppercase mb-4 sticky top-0 bg-[#111114] pb-2 border-b border-white/10 z-10">Scroll of Battle</div>
                </div>
            </div>
        </div>
    );
};

export default CombatView;
