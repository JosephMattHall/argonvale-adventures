import React, { useEffect } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
    Sword,
    Package,
    Users,
    TrendingUp,
    Compass,
    ShoppingCart,
    Trophy
} from 'lucide-react';
import CompanionsView from '../features/companions/CompanionsView';
import CompanionCreation from '../features/companions/CompanionCreation';
import BattleSelection from '../features/combat/BattleSelection';
import CombatView from '../features/combat/CombatView';
import TrainingView from '../features/training/TrainingView';
import InventoryView from '../features/inventory/InventoryView';
import ExplorationView from '../features/exploration/ExplorationView';
import ShopView from '../features/shop/ShopView';
import LeaderboardView from '../features/social/LeaderboardView';
import MyProfile from '../pages/MyProfile';
import UserProfile from '../pages/UserProfile';
import Messages from '../pages/Messages';
import { MessageSquare, Shield } from 'lucide-react';
import { useUser } from '../context/UserContext';
import ErrorBoundary from '../components/ErrorBoundary';

const AdminView = React.lazy(() => import('../features/admin/AdminView'));

const GameLayout: React.FC = () => {
    const { isConnected, messages } = useGameSocket();
    const { profile } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    const processedCombatIds = React.useRef<Set<string>>(new Set());

    // Auto-navigate to combat on PvP match (Global Listener)
    useEffect(() => {
        // Check the last few messages for a match event
        const recentMessages = messages.slice(-5);
        const combatStarted = recentMessages.find((m: any) =>
            m.type === 'CombatStarted' &&
            m.mode === 'pvp' &&
            (m.attacker_id === profile?.id || m.defender_id === profile?.id) &&
            !processedCombatIds.current.has(m.combat_id || m.combatId)
        );

        if (combatStarted) {
            const cid = combatStarted.combat_id || combatStarted.combatId;
            processedCombatIds.current.add(cid);

            // Check if we are already in battle to avoid loop/refresh issues
            if (!location.pathname.includes('/game/battle')) {
                console.log("Global Listener: PvP Match Found! Navigating...", combatStarted);
                navigate('/game/battle', {
                    state: {
                        battleContext: combatStarted.context,
                        combatId: cid,
                        origin: '/game/battle-select' // Default fallback
                    }
                });
            }
        }
    }, [messages, profile, navigate, location.pathname]);

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
                        <Link to="/game/leaderboard" className="block p-3 hover:bg-card-hover rounded transition-colors text-white flex items-center gap-2">
                            <Trophy size={18} className="text-gold" /> Hall of Heroes
                        </Link>
                        {profile?.role === 'admin' && (
                            <Link to="/game/admin" className="block p-3 hover:bg-card-hover rounded transition-colors text-white flex items-center gap-2 border-t border-white/5 mt-4 pt-4">
                                <Shield size={18} className="text-primary" /> Admin Citadel
                            </Link>
                        )}
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

                <main className="flex-1 glass-panel m-2 lg:ml-0 overflow-auto mb-20 lg:mb-2">
                    <div className="h-full p-4">
                        <ErrorBoundary>
                            <React.Suspense fallback={
                                <div className="h-full flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                                </div>
                            }>
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
                                    <Route path="leaderboard" element={<LeaderboardView />} />
                                    <Route path="messages/:userId" element={<Messages />} />
                                    <Route path="profile/me" element={<MyProfile />} />
                                    <Route path="profile/:username" element={<UserProfile />} />
                                    <Route path="admin" element={<AdminView />} />
                                    <Route path="*" element={<Navigate to="/game/explore" replace />} />
                                </Routes>
                            </React.Suspense>
                        </ErrorBoundary>
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
                    <span className="text-[10px] uppercase font-bold">Companions</span>
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
                    <span className="text-[10px] uppercase font-bold">Training</span>
                </Link>
            </nav>
        </div>
    );
};

export default GameLayout;
