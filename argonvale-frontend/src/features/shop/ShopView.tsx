import React, { useState, useEffect } from 'react';
import { shopApi } from '../../api/shop';
import type { ShopItem } from '../../api/shop';
import { useUser } from '../../context/UserContext';
import { Coins, Sword, Shield, ShoppingCart, Loader2 } from 'lucide-react';

const ShopView: React.FC = () => {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<number | null>(null);
    const { profile, refreshProfile } = useUser();

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const data = await shopApi.getItems();
                setItems(data);
            } catch (err) {
                console.error('Failed to fetch shop items:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, []);

    const handleBuy = async (item: ShopItem) => {
        if (!profile || profile.coins < item.price) return;

        setPurchasing(item.id);
        try {
            await shopApi.buyItem(item.id);
            await refreshProfile();
            // show success toast or message?
        } catch (err) {
            console.error('Failed to buy item:', err);
        } finally {
            setPurchasing(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="animate-spin text-gold" size={48} />
                <p className="text-gray-400 font-medieval">Gathering items for sale...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center p-4 glass-panel border-gold/30">
                <div>
                    <h1 className="text-3xl font-medieval text-gold drop-shadow-glow-gold">Argonvale Emporium</h1>
                    <p className="text-gray-400">Quality gear for every adventurer.</p>
                </div>
                <div className="flex items-center gap-2 bg-dark rounded-full px-6 py-3 border border-gold/30 shadow-glow-gold/10">
                    <Coins size={24} className="text-gold" />
                    <span className="text-2xl font-bold text-gold">{profile?.coins || 0}</span>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                    <div key={item.id} className="glass-panel hover:border-gold/50 transition-all group overflow-hidden flex flex-col">
                        <div className="p-4 bg-dark/50 border-b border-border-subtle flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-white group-hover:text-gold transition-colors">{item.name}</h3>
                                <div className="text-xs uppercase text-gray-500 font-bold flex items-center gap-1 mt-1">
                                    {item.item_type === 'weapon' ? <Sword size={12} className="text-primary" /> : <Shield size={12} className="text-secondary" />}
                                    {item.item_type}
                                </div>
                            </div>
                            <div className="text-gold font-bold flex items-center gap-1">
                                <Coins size={14} />
                                {item.price}
                            </div>
                        </div>

                        <div className="p-4 flex-1 space-y-3">
                            {/* Attack Icons */}
                            {item.stats?.atk && Object.keys(item.stats.atk).length > 0 && (
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Attack</div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(item.stats.atk).map(([type, val]: [any, any]) => (
                                            <div key={type} className="bg-primary/10 border border-primary/30 rounded px-2 py-1 flex items-center gap-1">
                                                <span className="text-primary text-xs font-bold">{val}</span>
                                                <span className="text-primary/70 text-[10px] uppercase">{type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Defense Icons */}
                            {item.stats?.def && Object.keys(item.stats.def).length > 0 && (
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Defense</div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(item.stats.def).map(([type, val]: [any, any]) => (
                                            <div key={type} className="bg-secondary/10 border border-secondary/30 rounded px-2 py-1 flex items-center gap-1">
                                                <span className="text-secondary text-xs font-bold">{val}</span>
                                                <span className="text-secondary/70 text-[10px] uppercase">{type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border-subtle bg-dark/20">
                            <button
                                onClick={() => handleBuy(item)}
                                disabled={purchasing !== null || (profile?.coins || 0) < item.price}
                                className={`w-full py-2 rounded font-bold flex items-center justify-center gap-2 transition-all ${(profile?.coins || 0) >= item.price
                                    ? 'bg-gold/20 hover:bg-gold text-gold hover:text-dark border border-gold/50'
                                    : 'bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed'
                                    }`}
                            >
                                {purchasing === item.id ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        <ShoppingCart size={18} />
                                        Buy Item
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShopView;
