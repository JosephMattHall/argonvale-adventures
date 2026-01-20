import React, { useEffect, useState } from 'react';
import { Package, Shield, Sword, Sparkles, MoreVertical, Trash2, Utensils, Zap, Snowflake, EyeOff } from 'lucide-react';
import type { Item } from '../../api/equipment';
import { equipmentApi } from '../../api/equipment';
import { companionsApi } from '../../api/companions';
import type { Companion } from '../../api/profiles';

const InventoryView: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [activeCompanions, setActiveCompanions] = useState<Companion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
    const [showFeedSubmenu, setShowFeedSubmenu] = useState<number | null>(null);

    const loadData = async () => {
        try {
            const [itemData, compData] = await Promise.all([
                equipmentApi.getInventory(),
                companionsApi.getActiveCompanions()
            ]);
            setItems(itemData);
            setActiveCompanions(compData);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleToggleEquip = async (itemId: number) => {
        try {
            await equipmentApi.toggleEquip(itemId);
            loadData();
            setMenuOpenId(null);
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to toggle equipment");
        }
    };

    const handleFeed = async (itemId: number, companionId: number) => {
        try {
            const result = await equipmentApi.feedCompanion(itemId, companionId);
            alert(result.message);
            loadData();
            setMenuOpenId(null);
            setShowFeedSubmenu(null);
        } catch (err: any) {
            alert(err.response?.data?.detail || "Feeding failed");
        }
    };

    const equippedCount = items.filter(i => i.is_equipped).length;

    const getEffectIcon = (type: string) => {
        switch (type) {
            case 'freeze': return <Snowflake size={14} className="text-cyan-400" />;
            case 'stealth': return <EyeOff size={14} className="text-purple-400" />;
            case 'hunger': return <Utensils size={14} className="text-orange-400" />;
            case 'heal': return <Zap size={14} className="text-emerald-400" />;
            default: return null;
        }
    };

    if (loading) return <div className="p-8 text-center text-gold font-medieval animate-pulse">Consulting the treasury...</div>;

    return (
        <div className="h-full flex flex-col p-2 lg:p-4 overflow-hidden" onClick={() => { setMenuOpenId(null); setShowFeedSubmenu(null); }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-medieval text-gold flex items-center gap-3">
                        <Package className="text-primary" />
                        Treasures & Gear
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Manage your combat arsenal and supplies</p>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            try {
                                await equipmentApi.seedTestItems();
                                loadData();
                            } catch (e) {
                                alert("Failed to seed items");
                            }
                        }}
                        className="text-[10px] bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-1.5 rounded uppercase tracking-widest text-primary transition-all whitespace-nowrap"
                    >
                        Seed Gear
                    </button>
                    <div className="text-xs bg-dark/40 px-3 py-1.5 rounded-full border border-white/10 text-gray-400 whitespace-nowrap">
                        Equipped: <span className={equippedCount >= 8 ? "text-primary font-bold" : "text-white"}>{equippedCount}</span> / 8
                    </div>
                </div>
            </div>

            {error && <div className="glass-panel p-4 mb-4 border-red-500/50 text-red-500 text-sm">{error}</div>}

            {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
                    <Package size={64} opacity={0.2} />
                    <p className="font-medieval text-lg">Your inventory is empty</p>
                    <p className="text-sm">Explore the regions to discover lost treasures.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-8">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={`
                                glass-panel p-0 flex flex-col border transition-all relative group
                                ${item.is_equipped ? 'border-primary bg-primary/5 shadow-glow-primary/10' : 'border-white/5 hover:border-white/20 hover:bg-white/5'}
                            `}
                        >
                            {/* Card Header & Content */}
                            <div className="p-4 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`p-2 rounded-lg ${item.is_equipped ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400'}`}>
                                        {item.item_type === 'weapon' ? <Sword size={20} /> : <Shield size={20} />}
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === item.id ? null : item.id); }}
                                            className="p-1 hover:bg-white/10 rounded transition-colors"
                                        >
                                            <MoreVertical size={18} className="text-gray-400" />
                                        </button>

                                        {/* Action Menu */}
                                        {menuOpenId === item.id && (
                                            <div className="absolute right-0 top-8 w-48 bg-[#0a0a0c] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                {item.item_type !== 'food' && (
                                                    <button
                                                        onClick={() => handleToggleEquip(item.id)}
                                                        className="w-full px-4 py-2.5 text-left text-xs text-white hover:bg-primary/20 flex items-center gap-2 transition-colors border-b border-white/5"
                                                    >
                                                        <Sparkles size={14} className="text-primary" />
                                                        {item.is_equipped ? 'Unequip' : 'Equip Gear'}
                                                    </button>
                                                )}

                                                {item.item_type === 'food' && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setShowFeedSubmenu(item.id); }}
                                                            className="w-full px-4 py-2.5 text-left text-xs text-white hover:bg-orange-500/20 flex items-center justify-between gap-2 transition-colors border-b border-white/5"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Utensils size={14} className="text-orange-400" />
                                                                Feed Companion
                                                            </div>
                                                            <span className="text-[8px] text-gray-500">▶</span>
                                                        </button>

                                                        {showFeedSubmenu === item.id && (
                                                            <div className="absolute left-full top-0 ml-1 w-40 bg-[#0a0a0c] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
                                                                {activeCompanions.map(comp => (
                                                                    <button
                                                                        key={comp.id}
                                                                        onClick={() => handleFeed(item.id, comp.id)}
                                                                        className="w-full px-3 py-2 text-left text-[10px] text-white hover:bg-white/10 flex items-center gap-2"
                                                                    >
                                                                        <img src={`/companions/${comp.image_url}`} alt="" className="w-5 h-5 rounded-full object-cover" />
                                                                        <span className="truncate">{comp.name}</span>
                                                                    </button>
                                                                ))}
                                                                {activeCompanions.length === 0 && <div className="px-3 py-2 text-[8px] text-gray-500 italic">No active companions</div>}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <button className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-red-500/20 flex items-center gap-2 transition-colors">
                                                    <Trash2 size={14} />
                                                    Throw Away
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-medieval text-white text-base leading-tight mb-1">{item.name}</h3>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[9px] uppercase font-bold tracking-widest text-primary/70">{item.item_type}</span>
                                        {item.category !== 'misc' && (
                                            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-600 border-l border-white/10 pl-2">{item.category}</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 line-clamp-3 mb-3 h-12 italic">
                                        {item.description || "A mysterious object from the depths of Argonvale."}
                                    </p>
                                </div>

                                {/* Detail Icons Row */}
                                <div className="flex flex-wrap gap-2 mt-auto">
                                    {/* Attack Stats */}
                                    {item.weapon_stats?.attack && Object.entries(item.weapon_stats.attack).map(([type, val]: [any, any]) => (
                                        <div key={type} className="flex items-center gap-1 bg-red-950/30 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                            <Sword size={8} /> {val}
                                        </div>
                                    ))}
                                    {/* Defense Stats */}
                                    {item.weapon_stats?.defense && Object.entries(item.weapon_stats.defense).map(([type, val]: [any, any]) => (
                                        <div key={type} className="flex items-center gap-1 bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                            <Shield size={8} /> {val}
                                        </div>
                                    ))}
                                    {/* Effects */}
                                    {item.effect?.type && (
                                        <div className="flex items-center gap-1 bg-white/5 text-gray-300 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-bold group/info relative cursor-help">
                                            {getEffectIcon(item.effect.type)}
                                            {item.effect.chance ? `${(item.effect.chance * 100).toFixed(0)}%` : item.effect.value}

                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 hidden group-hover/info:block z-50">
                                                <div className="bg-black border border-white/10 rounded-lg p-2 text-[8px] text-white shadow-2xl">
                                                    <span className="text-gold uppercase block mb-1">{item.effect.type}</span>
                                                    Effect: {item.effect.type === 'hunger' ? `Restores ${item.effect.value} hunger` : `${(item.effect.chance * 100)}% chance of ${item.effect.type}`}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Equipped Banner */}
                            {item.is_equipped && (
                                <div className="bg-primary/90 text-black text-[8px] font-bold uppercase tracking-widest text-center py-0.5">
                                    Equipped in Battle Slot
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InventoryView;
