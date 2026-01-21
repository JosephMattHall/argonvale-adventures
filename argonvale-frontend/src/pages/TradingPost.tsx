import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { tradesApi, type TradeLot } from '../api/trades';
import { Search, User, Calendar, Tag, ChevronLeft, ChevronRight, Store, Plus } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { equipmentApi } from '../api/equipment';

const TradingPost: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { profile } = useUser();

    const [lots, setLots] = useState<TradeLot[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [showCreate, setShowCreate] = useState(false);

    // Search states
    const [searchUser, setSearchUser] = useState(searchParams.get('username') || '');
    const [searchItem, setSearchItem] = useState(searchParams.get('item_name') || '');

    // Creation states
    const [myItems, setMyItems] = useState<any[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [lotDescription, setLotDescription] = useState('');

    // Offer states
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [selectedOfferLot, setSelectedOfferLot] = useState<TradeLot | null>(null);
    const [offerCoins, setOfferCoins] = useState<number>(0);
    const [offerItemIds, setOfferItemIds] = useState<number[]>([]);

    // Offer management states
    const [showOffersModal, setShowOffersModal] = useState(false);
    const [selectedLotForOffers, setSelectedLotForOffers] = useState<TradeLot | null>(null);
    const [lotOffers, setLotOffers] = useState<any[]>([]);
    const [offersLoading, setOffersLoading] = useState(false);

    useEffect(() => {
        loadLots();
    }, [page, searchParams]);

    const loadLots = async () => {
        setLoading(true);
        try {
            const username = searchParams.get('username') || undefined;
            const itemName = searchParams.get('item_name') || undefined;
            const data = await tradesApi.listTradeLots(page, username, itemName);
            setLots(data);
        } catch (error) {
            console.error('Failed to load trade lots:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params: any = { page: '1' };
        if (searchUser) params.username = searchUser;
        if (searchItem) params.item_name = searchItem;
        setSearchParams(params);
        setPage(1);
    };

    const loadInventory = async () => {
        try {
            const items = await equipmentApi.getInventory();
            // Only items not in a lot and not equipped
            setMyItems(items.filter((i: any) => !i.trade_lot_id && !i.is_equipped));
        } catch (error) {
            console.error('Failed to load inventory:', error);
        }
    };

    const toggleCreate = () => {
        if (!showCreate) {
            loadInventory();
        }
        setShowCreate(!showCreate);
    };

    const handleCreateLot = async () => {
        if (selectedItemIds.length === 0) {
            alert('Select at least one item');
            return;
        }
        try {
            await tradesApi.createTradeLot(selectedItemIds, lotDescription);
            alert('Trade lot created!');
            setShowCreate(false);
            setSelectedItemIds([]);
            setLotDescription('');
            loadLots();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to create trade lot');
        }
    };

    const handleMakeOffer = async () => {
        if (!selectedOfferLot) return;
        if (offerItemIds.length === 0 && offerCoins === 0) {
            alert('Offer at least one item or some coins');
            return;
        }
        try {
            await tradesApi.createTradeOffer(selectedOfferLot.id, offerItemIds, offerCoins);
            alert('Offer sent!');
            setShowOfferModal(false);
            setOfferItemIds([]);
            setOfferCoins(0);
            setSelectedOfferLot(null);
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to send offer');
        }
    };

    const loadLotOffers = async (lot: TradeLot) => {
        setOffersLoading(true);
        try {
            const data = await tradesApi.listLotOffers(lot.id);
            setLotOffers(data);
            setSelectedLotForOffers(lot);
            setShowOffersModal(true);
        } catch (error) {
            console.error('Failed to load lot offers:', error);
        } finally {
            setOffersLoading(false);
        }
    };

    const handleAcceptOffer = async (offerId: number) => {
        if (!window.confirm('Accept this offer? This will complete the trade and remove the lot.')) return;
        try {
            await tradesApi.acceptTradeOffer(offerId);
            alert('Trade completed!');
            setShowOffersModal(false);
            loadLots();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to accept offer');
        }
    };

    const handleRejectOffer = async (offerId: number) => {
        if (!window.confirm('Reject this offer?')) return;
        try {
            await tradesApi.rejectTradeOffer(offerId);
            if (selectedLotForOffers) loadLotOffers(selectedLotForOffers);
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to reject offer');
        }
    };

    return (
        <div className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-medieval text-gold flex items-center gap-3">
                    <Store size={32} />
                    Trading Post
                </h1>
                <button
                    onClick={toggleCreate}
                    className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-glow-primary/20"
                >
                    <Plus size={18} />
                    Create New Lot
                </button>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="glass-panel p-4 mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Search Item</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            value={searchItem}
                            onChange={(e) => setSearchItem(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:border-gold/50 outline-none transition-all"
                            placeholder="Ex: Spiked Shield..."
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Search User</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            value={searchUser}
                            onChange={(e) => setSearchUser(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:border-gold/50 outline-none transition-all"
                            placeholder="Ex: jdoe..."
                        />
                    </div>
                </div>
                <button type="submit" className="btn-primary h-[42px] px-8">
                    Filter
                </button>
                {(searchUser || searchItem) && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchUser('');
                            setSearchItem('');
                            setSearchParams({});
                        }}
                        className="h-[42px] px-4 text-gray-400 hover:text-white transition-colors"
                    >
                        Clear
                    </button>
                )}
            </form>

            {/* Create Lot Modal (Simple inner conditional for now) */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-medieval text-gold">Create Trade Lot</h2>
                            <button onClick={toggleCreate} className="text-gray-500 hover:text-white">&times;</button>
                        </div>
                        <div className="p-6 overflow-auto flex-1">
                            <p className="text-sm text-gray-400 mb-4 italic">Select up to 5 items to bundle together.</p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                                {myItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            if (selectedItemIds.includes(item.id)) {
                                                setSelectedItemIds(selectedItemIds.filter(id => id !== item.id));
                                            } else if (selectedItemIds.length < 5) {
                                                setSelectedItemIds([...selectedItemIds, item.id]);
                                            }
                                        }}
                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedItemIds.includes(item.id)
                                            ? 'border-gold bg-gold/10 scale-95'
                                            : 'border-white/5 bg-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center text-center gap-2">
                                            <div className="w-12 h-12 rounded bg-black/40 flex items-center justify-center border border-white/10">
                                                <Tag size={24} className="text-gray-500" />
                                            </div>
                                            <div className="text-xs font-bold text-white truncate w-full">{item.name}</div>
                                            <div className="text-[10px] text-gray-400">{item.rarity}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>


                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Lot Note (Optional)</label>
                            <textarea
                                value={lotDescription}
                                onChange={(e) => setLotDescription(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-gold/50 outline-none transition-all resize-none h-24 mb-6"
                                placeholder="What are you looking for in return?"
                            />

                            <div className="flex justify-end gap-3">
                                <button onClick={toggleCreate} className="px-6 py-2 rounded-lg text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button
                                    onClick={handleCreateLot}
                                    disabled={selectedItemIds.length === 0}
                                    className="bg-gold text-dark px-8 py-2 rounded-lg font-bold hover:bg-gold-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    List Lot
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Make Offer Modal */}
            {showOfferModal && selectedOfferLot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-medieval text-gold">Make Offer for {selectedOfferLot.username}'s Lot</h2>
                            <button onClick={() => setShowOfferModal(false)} className="text-gray-500 hover:text-white">&times;</button>
                        </div>
                        <div className="p-6 overflow-auto flex-1">
                            <p className="text-sm text-gray-400 mb-4 italic text-center text-gold/80">"What wouldst thou give for my bundle of treasures?"</p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                {myItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            if (offerItemIds.includes(item.id)) {
                                                setOfferItemIds(offerItemIds.filter(id => id !== item.id));
                                            } else if (offerItemIds.length < 5) {
                                                setOfferItemIds([...offerItemIds, item.id]);
                                            }
                                        }}
                                        className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${offerItemIds.includes(item.id)
                                            ? 'border-gold bg-gold/10'
                                            : 'border-white/5 bg-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center text-center gap-1">
                                            <div className="text-[10px] font-bold text-white truncate w-full">{item.name}</div>
                                            <div className="text-[8px] text-gray-500 uppercase">{item.rarity}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Offer Coins</label>
                            <div className="relative mb-6">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gold font-bold">$</div>
                                <input
                                    type="number"
                                    min="0"
                                    max={profile?.coins || 0}
                                    value={offerCoins}
                                    onChange={(e) => setOfferCoins(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-white focus:border-gold/50 outline-none transition-all"
                                    placeholder="0"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                                    Available: {profile?.coins || 0}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowOfferModal(false)} className="px-6 py-2 rounded-lg text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button
                                    onClick={handleMakeOffer}
                                    disabled={offerItemIds.length === 0 && offerCoins === 0}
                                    className="bg-gold text-dark px-8 py-2 rounded-lg font-bold hover:bg-gold-hover transition-all disabled:opacity-50"
                                >
                                    Send Offer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Offers Modal */}
            {showOffersModal && selectedLotForOffers && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-medieval text-gold">Offers for Your Lot</h2>
                            <button onClick={() => setShowOffersModal(false)} className="text-gray-500 hover:text-white">&times;</button>
                        </div>
                        <div className="p-6 overflow-auto flex-1">
                            {offersLoading ? (
                                <div className="text-center py-12 text-gray-500 animate-pulse font-medieval">Checking the bins...</div>
                            ) : lotOffers.length > 0 ? (
                                <div className="flex flex-col gap-4">
                                    {lotOffers.map(offer => (
                                        <div key={offer.id} className="p-4 rounded-lg bg-white/5 border border-white/10 flex flex-col gap-3 hover:border-gold/20 transition-all">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-dark border border-gold/20 flex items-center justify-center">
                                                        <User size={14} className="text-gold" />
                                                    </div>
                                                    <div className="font-bold text-white text-sm">{offer.offerer_username}</div>
                                                </div>
                                                <div className="text-[10px] text-gray-500">{new Date(offer.timestamp).toLocaleString()}</div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 p-3 bg-black/40 rounded border border-white/5">
                                                {offer.offered_coins > 0 && (
                                                    <div className="px-3 py-1 rounded bg-gold/10 border border-gold/30 text-xs text-gold font-bold">
                                                        $ {offer.offered_coins}
                                                    </div>
                                                )}
                                                {offer.offered_items.map((item: any) => (
                                                    <div key={item.id} className="px-3 py-1 rounded bg-white/5 border border-white/10 text-xs text-white">
                                                        {item.name} <span className="text-[10px] text-gray-500 ml-1">({item.rarity[0]})</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-end gap-3 mt-1">
                                                <button
                                                    onClick={() => handleRejectOffer(offer.id)}
                                                    className="px-6 py-1.5 rounded bg-danger/10 text-danger hover:bg-danger/20 text-[10px] font-bold uppercase tracking-wider border border-danger/20"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleAcceptOffer(offer.id)}
                                                    className="px-6 py-1.5 rounded bg-success/20 text-success hover:bg-success/30 text-[10px] font-bold uppercase tracking-wider border border-success/30"
                                                >
                                                    Accept Offer
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500 italic font-medieval border border-dashed border-white/10 rounded-lg p-8">
                                    No offers yet. Thy treasures await a worthy bidder.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content: Lot List */}
            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-48 text-gray-500 animate-pulse">
                        Wandering through the marketplace...
                    </div>
                ) : lots.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lots.map(lot => (
                            <div key={lot.id} className="glass-panel p-4 hover:border-white/20 transition-all flex flex-col gap-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-dark border border-gold/30 flex items-center justify-center">
                                            <User size={20} className="text-gold" />
                                        </div>
                                        <div>
                                            <Link to={`/game/profile/${lot.username}`} className="font-medieval text-white hover:text-gold transition-colors block">
                                                {lot.username}
                                            </Link>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                <Calendar size={10} />
                                                {new Date(lot.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    {lot.username === profile?.username && (
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Remove this trade listing?`)) {
                                                    await tradesApi.deleteTradeLot(lot.id);
                                                    loadLots();
                                                }
                                            }}
                                            className="text-[10px] text-danger/60 hover:text-danger uppercase font-bold"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-2 p-3 bg-black/40 rounded-lg border border-white/5 overflow-x-auto custom-scrollbar">
                                    {lot.items.map(item => (
                                        <div key={item.id} className="shrink-0 flex flex-col items-center gap-1 w-20">
                                            <div className="w-10 h-10 rounded bg-dark border border-white/10 flex items-center justify-center">
                                                <div className="text-[8px] font-bold text-gray-500 uppercase">{item.rarity[0]}</div>
                                            </div>
                                            <div className="text-[10px] text-white truncate w-full text-center">{item.name}</div>
                                        </div>
                                    ))}
                                </div>

                                {lot.description && (
                                    <div className="text-sm text-gray-400 bg-white/5 p-3 rounded italic">
                                        "{lot.description}"
                                    </div>
                                )}

                                {lot.username !== profile?.username ? (
                                    <button
                                        onClick={() => {
                                            setSelectedOfferLot(lot);
                                            loadInventory();
                                            setShowOfferModal(true);
                                        }}
                                        className="mt-auto bg-primary hover:bg-primary-hover text-white text-center py-2 rounded font-bold text-xs uppercase tracking-wider transition-all"
                                    >
                                        Make Offer
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => loadLotOffers(lot)}
                                        className="mt-auto bg-gold/10 hover:bg-gold/20 text-gold text-center py-2 rounded font-bold text-xs uppercase tracking-wider border border-gold/30 transition-all"
                                    >
                                        Manage Offers
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-panel p-12 text-center text-gray-500 italic">
                        No trade lots found Matching your criteria.
                    </div>
                )}
            </div>

            {/* Pagination */}
            {lots.length > 0 && (
                <div className="mt-6 flex justify-center items-center gap-4">
                    <button
                        onClick={() => {
                            const newPage = Math.max(1, page - 1);
                            setPage(newPage);
                            setSearchParams({ ...Object.fromEntries(searchParams), page: newPage.toString() });
                        }}
                        disabled={page === 1}
                        className="p-2 rounded bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-mono text-gold text-sm font-bold">Page {page}</span>
                    <button
                        onClick={() => {
                            const newPage = page + 1;
                            setPage(newPage);
                            setSearchParams({ ...Object.fromEntries(searchParams), page: newPage.toString() });
                        }}
                        disabled={lots.length < 10}
                        className="p-2 rounded bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default TradingPost;
