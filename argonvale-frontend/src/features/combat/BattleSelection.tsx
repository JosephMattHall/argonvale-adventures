import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { profilesApi, type Companion } from '../../api/profiles';
import { equipmentApi, type Item } from '../../api/equipment';
import { useGameSocket } from '../../hooks/useGameSocket';
import { Swords, ChevronRight, Shield, Heart, Zap } from 'lucide-react';

const OPPONENTS = [
    {
        name: "Wild Emberfang", species: "Emberfang", type: "Fire",
        stats: { STR: 12, DEF: 8, HP: 60 },
        weapons: [
            { name: "Spark Staff", stats: { atk: { fire: 6, light: 2 } } },
            { name: "Searing Claws", stats: { atk: { fire: 5 } } },
            { name: "Fire Herb", stats: { atk: { fire: 3 } } }
        ],
        items: [
            { id: "p1", name: "Fire Herb", type: "heal", value: 25 },
            { id: "p1b", name: "Ash Shield", type: "block", value: 15 },
            { id: "p1c", name: "Magma Potion", type: "heal", value: 30 },
            { id: "p1d", name: "Smolder Stone", stats: { atk: { fire: 6 } } },
            { id: "p1e", name: "Ember Cloak", stats: { def: { fire: 8 } } }
        ]
    },
    {
        name: "Ancient Stoneback", species: "Stoneback Tortoise", type: "Earth",
        stats: { STR: 10, DEF: 20, HP: 100 },
        weapons: [
            { name: "Stone Shield", stats: { def: { earth: 12 } } },
            { name: "Crushing Shell", stats: { atk: { earth: 5 } } },
            { name: "Rock Spike", stats: { atk: { earth: 8 } } }
        ],
        items: [
            { id: "p2", name: "Hardened Resin", type: "block", value: 10 },
            { id: "p2b", name: "Iron Bark", type: "block", value: 20 },
            { id: "p2c", name: "Mountain Dew", type: "heal", value: 50 },
            { id: "p2d", name: "Sand Armor", stats: { def: { earth: 10 } } },
            { id: "p2e", name: "Dust Potion", type: "heal", value: 25 }
        ]
    },
    {
        name: "Storm Raptor", species: "Galehorn Raptor", type: "Wind",
        stats: { STR: 18, DEF: 6, HP: 55 },
        weapons: [
            { name: "Stormcaller Bow", stats: { atk: { wind: 15 } } },
            { name: "Razor Wing", stats: { atk: { wind: 8 } } },
            { name: "Wind Talon", stats: { atk: { wind: 8 } } }
        ],
        items: [
            { id: "p3", name: "Gale Potion", type: "heal", value: 20 },
            { id: "p3b", name: "Cloud Mist", type: "block", value: 20 },
            { id: "p3c", name: "Sky Berry", type: "heal", value: 25 },
            { id: "p3d", name: "Feather Guard", stats: { def: { wind: 8 } } },
            { id: "p3e", name: "Zephyr Wing", stats: { atk: { wind: 6 } } }
        ]
    },
    {
        name: "Tidal Serpent", species: "Tidemaw Serpent", type: "Water",
        stats: { STR: 14, DEF: 14, HP: 75 },
        weapons: [
            { name: "Corsair's Cutlass", stats: { atk: { phys: 14, water: 6 } } },
            { name: "Water Whip", stats: { atk: { water: 8 } } },
            { name: "Ocean Guard", stats: { def: { water: 15 } } }
        ],
        items: [
            { id: "p4", name: "Healing Mist", type: "heal", value: 35 },
            { id: "p4b", name: "Coral Shield", type: "block", value: 15 },
            { id: "p4c", name: "Pearl Potion", type: "heal", value: 40 },
            { id: "p4d", name: "Shell Mail", stats: { def: { water: 10 } } },
            { id: "p4e", name: "Wave Potion", type: "heal", value: 25 }
        ]
    },
    {
        name: "Void Umbraclaw", species: "Umbraclaw", type: "Shadow",
        stats: { STR: 20, DEF: 10, HP: 70 },
        weapons: [
            { name: "Executioner's Axe", stats: { atk: { shadow: 15 } } },
            { name: "Shadow Edge", stats: { atk: { shadow: 10 } } },
            { name: "Void Fang", stats: { atk: { shadow: 12 } } }
        ],
        items: [
            { id: "p5", name: "Dark Elixir", type: "heal", value: 40 },
            { id: "p5b", name: "Umbra Veil", type: "block", value: 20 },
            { id: "p5c", name: "Nightshade", type: "heal", value: 35 },
            { id: "p5d", name: "Ghost Armor", stats: { def: { shadow: 12 } } },
            { id: "p5e", name: "Dusk Potion", type: "heal", value: 30 }
        ]
    },
    {
        name: "System Overlord", species: "Computer", type: "Digital",
        stats: { STR: 25, DEF: 20, HP: 200 },
        weapons: [
            { name: "Binary Blade", stats: { atk: { light: 25 } } },
            { name: "Kernel Crusher", stats: { atk: { earth: 20, light: 10 } } },
            { name: "Overclocked Rifle", stats: { atk: { wind: 25 } } }
        ],
        items: [
            { id: "p6", name: "Firewall Aegis", stats: { def: { fire: 15, phys: 15 } } },
            { id: "p6b", name: "Logic Shield", stats: { def: { light: 18, phys: 12 } } },
            { id: "p6c", name: "System Restore", type: "heal", value: 100 },
            { id: "p6d", name: "Patch Potion", type: "heal", value: 60 },
            { id: "p6e", name: "Cache Clear", type: "block", value: 40 }
        ]
    },
];

const BattleSelection: React.FC = () => {
    const navigate = useNavigate();
    const { sendCommand, messages } = useGameSocket();
    const { profile } = useUser();
    const [companions, setCompanions] = useState<Companion[]>([]);
    const [equippedItems, setEquippedItems] = useState<Item[]>([]);
    const [selectedOpponent, setSelectedOpponent] = useState<number | null>(null);
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
                if (compData.length > 0) setSelectedCompanionId(compData[0].id);
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
        const combatStarted = newMessages.find((m: any) => m.type === 'CombatStarted' && m.attacker_id === profile?.id);
        if (combatStarted) {
            setIsStarting(false);
            setIsQueuing(false);
            navigate('/game/battle', { state: { battleContext: combatStarted.context, combatId: combatStarted.combat_id } });
        }
    }, [messages, profile, navigate, isStarting, initialMsgCount]);

    const handleStartBattle = () => {
        if (selectedOpponent === null || selectedCompanionId === null) return;

        const opponent = OPPONENTS[selectedOpponent];

        setIsStarting(true);
        setInitialMsgCount(messages.length);
        sendCommand({
            type: "EnterCombat",
            opponent,
            companion_id: selectedCompanionId
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
                Battle Arena
            </h2>

            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8 flex-1 overflow-y-auto lg:overflow-hidden pr-1 custom-scrollbar">
                {/* Companion Selection */}
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
                                    <div className="w-12 h-12 bg-dark rounded-lg flex items-center justify-center text-2xl">
                                        {comp.image_url ? <img src={comp.image_url} alt="" className="w-full h-full object-cover rounded shadow" /> : '👤'}
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

                {/* Opponent List */}
                <div className="lg:col-span-2 flex flex-col min-h-0">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Choose Your Opponent</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
                        {OPPONENTS.map((opp, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedOpponent(idx)}
                                className={`
                                    glass-panel p-4 cursor-pointer transition-all flex items-center justify-between
                                    ${selectedOpponent === idx ? 'border-primary bg-primary/10' : 'hover:bg-white/5'}
                                `}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center text-2xl shadow-inner">
                                        {opp.type === 'Fire' ? '🔥' : opp.type === 'Water' ? '💧' : opp.type === 'Earth' ? '🗿' : '👹'}
                                    </div>
                                    <div>
                                        <div className="font-medieval text-white">{opp.name}</div>
                                        <div className="text-[10px] text-gray-400 uppercase tracking-widest">{opp.type} • HP: {opp.stats.HP}</div>
                                    </div>
                                </div>
                                <ChevronRight size={20} className={selectedOpponent === idx ? 'text-primary' : 'text-gray-600'} />
                            </div>
                        ))}
                    </div>

                    <div className="sticky bottom-0 lg:static bg-dark lg:bg-transparent py-4 lg:py-0">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                disabled={selectedOpponent === null || selectedCompanionId === null || (selectedCompanion?.hp === 0) || isStarting || isQueuing}
                                onClick={handleStartBattle}
                                className="btn-primary flex-1 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-glow-primary/20"
                            >
                                <Swords />
                                {isStarting ? 'Entering Arena...' : selectedCompanion?.hp === 0 ? 'Heal Companion First!' : 'Enter Combat'}
                            </button>

                            <button
                                disabled={selectedCompanionId === null || (selectedCompanion?.hp === 0) || isStarting || isQueuing}
                                onClick={handleJoinQueue}
                                className="btn-gold flex-1 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-glow-gold/20"
                            >
                                <Zap className={isQueuing ? 'animate-spin' : ''} />
                                {isQueuing ? 'Searching for Rivals...' : 'Queue for PvP'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BattleSelection;
