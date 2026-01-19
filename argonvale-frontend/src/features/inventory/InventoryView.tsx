import React, { useEffect, useState } from 'react';
import { Package, Shield, Sword, Sparkles } from 'lucide-react';
import type { Item } from '../../api/equipment';
import { equipmentApi } from '../../api/equipment';

const InventoryView: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadInventory = async () => {
        try {
            const data = await equipmentApi.getInventory();
            setItems(data);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to load inventory");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInventory();
    }, []);

    const handleToggleEquip = async (itemId: number) => {
        try {
            await equipmentApi.toggleEquip(itemId);
            loadInventory();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to toggle equipment");
        }
    };

    const equippedCount = items.filter(i => i.is_equipped).length;

    if (loading) return <div className="p-8 text-center text-gray-400">Loading treasures...</div>;

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-medieval text-gold flex items-center gap-3">
                    <Package className="text-primary" />
                    Treasures & Gear
                </h2>
                <div className="flex items-center gap-4">
                    <button
                        onClick={async () => {
                            try {
                                await equipmentApi.seedTestItems();
                                loadInventory();
                                alert("Test items seeded!");
                            } catch (e) {
                                alert("Failed to seed items");
                            }
                        }}
                        className="text-[10px] bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-1.5 rounded uppercase tracking-widest text-primary transition-all"
                    >
                        Seed Test gear
                    </button>
                    <div className="text-sm text-gray-400">
                        Equipped: <span className={equippedCount >= 8 ? "text-primary font-bold" : "text-white"}>{equippedCount}</span> / 8
                    </div>
                </div>
            </div>

            {error && <div className="glass-panel p-4 mb-4 border-red-500/50 text-red-500 text-sm">{error}</div>}

            {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
                    <Package size={64} opacity={0.2} />
                    <p>Your inventory is empty. Discover loot in the wild!</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    {items.map(item => (
                        <div
                            key={item.id}
                            onClick={() => handleToggleEquip(item.id)}
                            className={`
                                glass-panel p-4 cursor-pointer transition-all group relative
                                ${item.is_equipped ? 'border-primary bg-primary/10 shadow-glow' : 'hover:border-white/20 hover:bg-white/5'}
                            `}
                        >
                            {item.is_equipped && (
                                <div className="absolute -top-2 -right-2 bg-primary text-black p-1 rounded-full text-[10px] font-bold shadow-lg">
                                    <Sparkles size={12} />
                                </div>
                            )}

                            <div className="h-24 bg-black/40 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                                {item.item_type === 'weapon' ? (
                                    <Sword className="text-primary opacity-50 group-hover:opacity-100 transition-opacity" size={32} />
                                ) : (
                                    <Shield className="text-secondary opacity-50 group-hover:opacity-100 transition-opacity" size={32} />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                                        {item.is_equipped ? 'Unequip' : 'Equip'}
                                    </span>
                                </div>
                            </div>

                            <div className="font-medieval text-sm text-white mb-1 truncate">{item.name}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-tighter mb-2">{item.item_type}</div>

                            {/* Mini Stats */}
                            {item.weapon_stats?.attack && (
                                <div className="flex flex-wrap gap-1">
                                    {Object.entries(item.weapon_stats.attack).map(([type, val]: [any, any]) => (
                                        <div key={type} className="text-[10px] bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/40">
                                            {val} {type}
                                        </div>
                                    ))}
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
