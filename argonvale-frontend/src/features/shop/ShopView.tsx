import React, { useState, useEffect } from 'react';
import { shopApi } from '../../api/shop';
import type { ShopItem } from '../../api/shop';
import { useUser } from '../../context/UserContext';
import { Coins, Sword, Shield, ShoppingCart, Loader2, Utensils, Snowflake, EyeOff, Sparkles, Filter, Info } from 'lucide-react';

const ShopView: React.FC = () => {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');
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
            alert(`Successfully purchased ${item.name}!`);
        } catch (err: any) {
            alert(err.response?.data?.detail || "Purchase failed");
        } finally {
            setPurchasing(null);
        }
    };

    const categories = ['all', 'weapons', 'armor', 'food', 'utility'];
    const filteredItems = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory);

    const getEffectIcon = (type: string) => {
        switch (type) {
            case 'freeze': return <Snowflake size={14} className="text-cyan-400" />;
            case 'stealth': return <EyeOff size={14} className="text-purple-400" />;
            case 'hunger': return <Utensils size={14} className="text-orange-400" />;
            case 'heal': return <Sparkles size={14} className="text-emerald-400" />;
            default: return null;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 animate-pulse">
                <Loader2 className="animate-spin text-gold" size={48} />
                <p className="text-gray-400 font-medieval text-xl">Unlocking the vault...</p>
            </div>
        );
    }

    return (
        <div className="min-h-full flex flex-col p-2 lg:p-6 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 lg:p-6 glass-panel border-gold/20 mb-4 lg:mb-6 gap-4 lg:gap-6 bg-gradient-to-r from-gold/5 to-transparent">
                <div className="flex-1">
                    <h1 className="text-xl lg:text-4xl font-medieval text-gold drop-shadow-glow-gold flex items-center gap-3">
                        <ShoppingCart className="text-gold" size={24} />
                        Argonvale Emporium
                    </h1>
                    <p className="hidden md:block text-xs lg:text-sm text-gray-500 uppercase tracking-widest mt-2">Only the finest artifacts for the legends of our realm.</p>
                </div>
                <div className="flex items-center gap-3 bg-black/40 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-2 lg:py-4 border border-gold/30 shadow-glow-gold/10 w-full md:w-auto">
                    <div className="p-1.5 lg:p-2 bg-gold/10 rounded-lg">
                        <Coins size={18} className="text-gold" />
                    </div>
                    <div>
                        <div className="text-[8px] lg:text-[10px] text-gray-500 uppercase font-bold tracking-tighter leading-none mb-1">Treasury</div>
                        <div className="text-xl lg:text-3xl font-bold text-gold tabular-nums leading-none">
                            {profile?.coins?.toLocaleString() || 0}
                        </div>
                    </div>
                </div>
            </header>

            {/* Category Filters */}
            <div className="flex items-center gap-2 mb-4 lg:mb-8 overflow-x-auto pb-4 custom-scrollbar shrink-0">
                <div className="flex items-center gap-2 mr-4 border-r border-white/10 pr-4 shrink-0">
                    <Filter size={14} className="text-gray-500" />
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Filters</span>
                </div>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`
                            px-4 lg:px-6 py-1.5 lg:py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap
                            ${activeCategory === cat ? 'bg-primary text-black border-primary shadow-glow-primary/20' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:bg-white/10'}
                        `}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Item Grid */}
            <div className="pb-12">
                {filteredItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 opacity-50">
                        <ShoppingCart size={80} strokeWidth={1} />
                        <p className="font-medieval text-2xl uppercase tracking-widest">No wares found in this category</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {filteredItems.map((item) => (
                            <div key={item.id} className="glass-panel hover:border-gold/40 transition-all group overflow-hidden flex flex-col relative bg-[#0e0e11]">
                                {/* Item Image/Symbol */}
                                <div className="h-32 lg:h-40 bg-black/40 flex items-center justify-center border-b border-white/5 relative overflow-hidden group-hover:bg-black/60 transition-colors">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="text-4xl lg:text-6xl group-hover:scale-110 transition-transform duration-500">
                                        {item.category === 'weapons' ? '⚔️' :
                                            item.category === 'armor' ? '🛡️' :
                                                item.category === 'food' ? '🍖' : '✨'}
                                    </div>
                                    <div className="absolute top-2 right-2 lg:top-3 lg:right-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-full border border-gold/30 shadow-2xl">
                                        <Coins size={10} className="text-gold" />
                                        <span className="text-[10px] lg:text-xs font-bold text-gold">{item.price}</span>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col gap-4">
                                    <div>
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-lg font-medieval text-white group-hover:text-gold transition-colors truncate pr-2">{item.name}</h3>
                                            <div className="text-[10px] text-gray-500 tracking-tighter uppercase font-bold shrink-0">{item.item_type}</div>
                                        </div>
                                        <p className="text-[10px] text-gray-500 line-clamp-3 leading-relaxed italic h-12">
                                            {item.description || "Forged in the heart of Argonvale, this item carries ancient power."}
                                        </p>
                                    </div>

                                    {/* Stats & Effects Row */}
                                    <div className="flex flex-wrap gap-2 mt-auto min-h-[50px] content-start">
                                        {/* Attack Stats */}
                                        {item.stats?.attack && Object.entries(item.stats.attack).map(([type, val]: [any, any]) => (
                                            <div key={type} className="flex items-center gap-1.5 bg-red-950/20 text-red-400 border border-red-900/30 px-2 py-1 rounded text-[9px] font-bold uppercase">
                                                <Sword size={10} /> {val} {type}
                                            </div>
                                        ))}
                                        {/* Defense Stats */}
                                        {item.stats?.defense && Object.entries(item.stats.defense).map(([type, val]: [any, any]) => (
                                            <div key={type} className="flex items-center gap-1.5 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 px-2 py-1 rounded text-[9px] font-bold uppercase">
                                                <Shield size={10} /> {val} {type}
                                            </div>
                                        ))}
                                        {/* Effects */}
                                        {item.effect?.type && (
                                            <div className="flex items-center gap-1.5 bg-white/5 text-gold border border-gold/20 px-2 py-1 rounded text-[9px] font-bold uppercase relative group/info cursor-help">
                                                {getEffectIcon(item.effect.type)}
                                                {item.effect.type}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 hidden group-hover/info:block z-50">
                                                    <div className="bg-black border border-gold/30 rounded-lg p-3 text-[10px] text-white shadow-3xl">
                                                        <div className="text-gold font-bold mb-1 uppercase tracking-wider flex items-center gap-2">
                                                            <Info size={12} />
                                                            {item.effect.type} Effect
                                                        </div>
                                                        <p className="text-gray-400 normal-case italic">
                                                            {item.effect.type === 'freeze' ? 'High chance to immobilize the target for 1 turn.' :
                                                                item.effect.type === 'stealth' ? 'Grants total evasion for the next turn.' :
                                                                    item.effect.type === 'hunger' ? `Restores ${item.effect.value} hunger to a companion.` :
                                                                        item.effect.type === 'heal' ? `Restores ${item.effect.value} HP instantly.` : 'A powerful mystery effect.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleBuy(item)}
                                        disabled={purchasing !== null || (profile?.coins || 0) < item.price}
                                        className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all border mt-2
                                            ${(profile?.coins || 0) >= item.price
                                                ? 'bg-gold/10 hover:bg-gold text-gold hover:text-black border-gold/40 shadow-glow-gold/10'
                                                : 'bg-black/40 text-gray-700 border-white/5 cursor-not-allowed'
                                            }`}
                                    >
                                        {purchasing === item.id ? (
                                            <Loader2 className="animate-spin" size={16} />
                                        ) : (
                                            <>
                                                <ShoppingCart size={16} />
                                                Purchase Item
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShopView;
