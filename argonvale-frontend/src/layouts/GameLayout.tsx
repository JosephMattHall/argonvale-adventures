import React from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
    Sword,
    Package,
    Users,
    TrendingUp,
    Compass,
    ShoppingCart
} from 'lucide-react';
import CompanionsView from '../features/companions/CompanionsView';
import CompanionCreation from '../features/companions/CompanionCreation';
import BattleSelection from '../features/combat/BattleSelection';
import CombatView from '../features/combat/CombatView';
import TrainingView from '../features/training/TrainingView';
import InventoryView from '../features/inventory/InventoryView';
import ExplorationView from '../features/exploration/ExplorationView';
import ShopView from '../features/shop/ShopView';
import MyProfile from '../pages/MyProfile';
import UserProfile from '../pages/UserProfile';
import Messages from '../pages/Messages';
import { MessageSquare } from 'lucide-react';

const GameLayout: React.FC = () => {
    const { isConnected, messages } = useGameSocket();
    const navigate = useNavigate();

    // Auto-navigate to combat on encounter
    React.useEffect(() => {
        if (messages.length === 0) return;
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.type === 'CombatStarted') {
            navigate('/game/battle', {
                state: {
                    battleContext: lastMsg.context,
                    combatId: lastMsg.combat_id
                }
            });
        }
    }, [messages, navigate]);

    return (
        <div className="h-screen w-full flex flex-col bg-dark">
            <Navbar />
            <div className="flex-1 flex overflow-hidden">
                <aside className="hidden lg:flex w-64 glass-panel m-2 flex-col">
                    <div className="p-4 font-medieval text-gold text-xl border-b border-border-subtle">
                        Game Menu
                    </div>

                    <nav className="p-4 flex-1 space-y-2">
                        <Link to="/game/battle-select" className="block p-3 hover:bg-card-hover rounded transition-colors text-white flex items-center gap-2">
                            <Sword size={18} className="text-primary" /> Battle Selection
                        </Link>
                        <Link to="/game/companions" className="block p-3 hover:bg-card-hover rounded transition-colors text-white flex items-center gap-2">
                            <Users size={18} className="text-secondary" /> Companions
                        </Link>
                        <Link to="/game/explore" className="block p-3 hover:bg-card-hover rounded transition-colors text-white flex items-center gap-2">
                            <Compass size={18} className="text-success" /> Explore
                        </Link>
                        <Link to="/game/inventory" className="block p-3 hover:bg-card-hover rounded transition-colors text-white flex items-center gap-2">
                            <Package size={18} className="text-gold" /> Inventory
                        </Link>
                        <Link to="/game/shop" className="block p-3 hover:bg-card-hover rounded transition-colors text-white flex items-center gap-2">
                            <ShoppingCart size={18} className="text-warning" /> Shop
                        </Link>
                        <Link to="/game/train" className="block p-3 hover:bg-card-hover rounded transition-colors text-white flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary" /> Training
                        </Link>
                        <Link to="/game/messages" className="block p-3 hover:bg-card-hover rounded transition-colors text-white flex items-center gap-2">
                            <MessageSquare size={18} className="text-secondary" /> Messages
                        </Link>
                    </nav>

                    <div className="p-4 border-t border-border-subtle text-xs">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success shadow-[0_0_8px_var(--accent-success)]' : 'bg-gray-500'}`} />
                            <span className="text-gray-400">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 glass-panel m-2 lg:ml-0 overflow-hidden flex flex-col mb-20 lg:mb-2">
                    <div className="flex-1 overflow-auto p-4">
                        <Routes>
                            <Route path="battle-select" element={<BattleSelection />} />
                            <Route path="battle" element={<CombatView />} />
                            <Route path="companions" element={<CompanionsView />} />
                            <Route path="companions/create" element={<CompanionCreation />} />
                            <Route path="shop" element={<ShopView />} />
                            <Route path="train" element={<TrainingView />} />
                            <Route path="inventory" element={<InventoryView />} />
                            <Route path="explore" element={<ExplorationView />} />
                            <Route path="messages" element={<Messages />} />
                            <Route path="messages/:userId" element={<Messages />} />
                            <Route path="profile/me" element={<MyProfile />} />
                            <Route path="profile/:username" element={<UserProfile />} />
                            <Route path="*" element={<Navigate to="/game/explore" replace />} />
                        </Routes>
                    </div>

                    <div className="h-20 border-t border-border-subtle p-2 bg-dark/50">
                        <div className="text-[10px] text-gray-500 uppercase mb-1">Server Messages</div>
                        <div className="h-full overflow-auto text-xs font-mono text-gray-400 custom-scrollbar">
                            {messages.slice(-3).map((msg, idx) => (
                                <div key={idx} className="truncate border-b border-white/5 last:border-0 py-1">
                                    <span className="text-primary mr-2">[{msg.type}]</span>
                                    {JSON.stringify(msg.payload || msg)}
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>

            {/* Bottom Navigation for Mobile */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-panel m-2 h-16 flex justify-around items-center z-50">
                <Link to="/game/explore" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
                    <Compass size={20} className="text-success" />
                    <span className="text-[10px] uppercase font-bold">World</span>
                </Link>
                <Link to="/game/battle-select" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
                    <Sword size={20} className="text-primary" />
                    <span className="text-[10px] uppercase font-bold">Arena</span>
                </Link>
                <Link to="/game/companions" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
                    <Users size={20} className="text-secondary" />
                    <span className="text-[10px] uppercase font-bold">Party</span>
                </Link>
                <Link to="/game/inventory" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
                    <Package size={20} className="text-gold" />
                    <span className="text-[10px] uppercase font-bold">Bag</span>
                </Link>
                <Link to="/game/shop" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
                    <ShoppingCart size={20} className="text-warning" />
                    <span className="text-[10px] uppercase font-bold">Shop</span>
                </Link>
                <Link to="/game/train" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
                    <TrendingUp size={20} className="text-primary" />
                    <span className="text-[10px] uppercase font-bold">Power</span>
                </Link>
            </nav>
        </div>
    );
};

export default GameLayout;
