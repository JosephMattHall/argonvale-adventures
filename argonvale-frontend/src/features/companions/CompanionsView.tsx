import React, { useState, useEffect } from 'react';
import { Users, ArrowDownUp, RefreshCw, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { companionsApi } from '../../api/companions';
import type { Companion } from '../../api/profiles';

const CompanionsView: React.FC = () => {
    const navigate = useNavigate();
    const [allCompanions, setAllCompanions] = useState<Companion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCompanions();
    }, []);

    const loadCompanions = async () => {
        setLoading(true);
        try {
            const response = await companionsApi.getAllCompanions();
            setAllCompanions(response);
        } catch (error) {
            console.error('Failed to load companions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSummon = () => {
        navigate('/game/companions/create');
    };

    const handleToggleActive = async (id: number) => {
        try {
            await companionsApi.toggleActive(id);
            await loadCompanions(); // Refresh list
        } catch (error: any) {
            alert(error.response?.data?.detail || "Failed to update companion status");
        }
    };

    const handleAbandon = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to abandon ${name}? This cannot be undone.`)) {
            return;
        }

        try {
            const result = await companionsApi.abandonCompanion(id);
            alert(result.message);
            await loadCompanions(); // Refresh list
        } catch (error: any) {
            alert(error.response?.data?.detail || "Failed to abandon companion");
        }
    };

    const activeParty = allCompanions.filter(c => c.is_active);
    const boarding = allCompanions.filter(c => !c.is_active);

    // Update scroll indicator width when boarding companions change
    useEffect(() => {
        const updateIndicatorWidth = () => {
            const container = document.getElementById('boarding-scroll');
            const indicator = document.getElementById('scroll-indicator');
            if (container && indicator) {
                const widthPercentage = Math.min(100, (container.clientWidth / container.scrollWidth) * 100);
                indicator.style.width = `${widthPercentage}%`;
            }
        };

        // Update on mount and when boarding changes
        setTimeout(updateIndicatorWidth, 100);
        window.addEventListener('resize', updateIndicatorWidth);

        return () => window.removeEventListener('resize', updateIndicatorWidth);
    }, [boarding.length]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <RefreshCw className="animate-spin text-gold" size={48} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-4 sm:gap-6 p-2 sm:p-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-medieval text-gold flex items-center gap-2 sm:gap-3">
                    <Users size={24} className="sm:hidden" />
                    <Users size={32} className="hidden sm:block" />
                    <span className="hidden sm:inline">Companions Management</span>
                    <span className="sm:hidden">Companions</span>
                </h2>
                <button
                    onClick={handleSummon}
                    className="btn-gold flex items-center gap-1 shadow-glow-gold px-3 py-2 text-sm"
                    title={`Summon new companion (${allCompanions.length <= 1 ? 'Free!' : '500 coins'})`}
                >
                    <span className="text-lg">+</span>
                    <span className="hidden sm:inline">Create</span>
                </button>
            </div>

            {/* Active Party Section */}
            <div className="glass-panel p-3 sm:p-6 flex-1">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <div className="text-xs sm:text-sm font-bold text-primary uppercase tracking-widest">
                        Active Squad ({activeParty.length}/4)
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                    {activeParty.map(comp => (
                        <div key={comp.id} className="bg-dark/50 rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center border-2 border-primary relative group hover:bg-dark/70 transition-all">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 border-white/10 mb-1 sm:mb-2">
                                <img
                                    src={`/companions/${comp.image_url}`}
                                    alt={comp.name}
                                    onError={(e) => e.currentTarget.src = '/companions/default_companion.png'}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="font-medieval text-white text-sm sm:text-lg truncate w-full text-center">{comp.name}</div>
                            <div className="text-[10px] sm:text-xs text-gray-400 uppercase">{comp.species} • Lvl {comp.level}</div>
                            <div className="mt-2 w-full bg-dark h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-danger h-full"
                                    style={{ width: `${(comp.hp / comp.max_hp) * 100}%` }}
                                ></div>
                            </div>

                            <button
                                onClick={() => handleToggleActive(comp.id)}
                                className="absolute top-1 sm:top-2 right-1 sm:right-2 p-1 bg-dark/80 rounded hover:bg-danger text-gray-300 hover:text-white transition-all shadow-lg"
                                title="Send to Boarding"
                            >
                                <ArrowDownUp size={16} className="sm:hidden" />
                                <ArrowDownUp size={18} className="hidden sm:block" />
                            </button>
                        </div>
                    ))}
                    {[...Array(Math.max(0, 4 - activeParty.length))].map((_, i) => (
                        <div key={`empty-${i}`} className="border-2 border-dashed border-border-subtle rounded-lg flex items-center justify-center text-gray-600 h-28 sm:h-32 italic text-xs sm:text-base">
                            Empty Slot
                        </div>
                    ))}
                </div>
            </div>

            {/* Boarding Section - Horizontal Scrollable */}
            {boarding.length > 0 && (
                <div className="glass-panel p-3 sm:p-4">
                    <div className="text-xs sm:text-sm font-bold text-gray-400 mb-3 uppercase tracking-widest">
                        Boarding ({boarding.length})
                    </div>
                    <div className="relative group">
                        <div
                            id="boarding-scroll"
                            className="flex gap-3 overflow-x-auto pb-2 scroll-smooth hide-scrollbar"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            onScroll={(e) => {
                                const container = e.currentTarget;
                                const scrollPercentage = (container.scrollLeft / (container.scrollWidth - container.clientWidth)) * 100;
                                const indicator = document.getElementById('scroll-indicator');
                                if (indicator) {
                                    indicator.style.left = `${scrollPercentage}%`;
                                }
                            }}
                        >
                            {boarding.map(comp => (
                                <div key={comp.id} className="bg-dark/30 rounded-lg p-3 flex flex-col items-center justify-center hover:bg-dark/50 border border-border-subtle relative group/card transition-all min-w-[120px] sm:min-w-[140px]">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-white/10 mb-2">
                                        <img
                                            src={`/companions/${comp.image_url}`}
                                            alt={comp.name}
                                            onError={(e) => e.currentTarget.src = '/companions/default_companion.png'}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="font-medieval text-white text-sm truncate w-full text-center">{comp.name}</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-tighter">{comp.species} • Lvl {comp.level}</div>

                                    <div className="absolute top-1 right-1 flex gap-1">
                                        <button
                                            onClick={() => handleToggleActive(comp.id)}
                                            className="p-1 bg-dark/80 rounded hover:bg-success text-gray-400 hover:text-white transition-all sm:opacity-0 sm:group-hover/card:opacity-100"
                                            title="Add to Party"
                                        >
                                            <ArrowDownUp size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleAbandon(comp.id, comp.name)}
                                            className="p-1 bg-dark/80 rounded hover:bg-danger text-gray-400 hover:text-white transition-all sm:opacity-0 sm:group-hover/card:opacity-100"
                                            title="Abandon Companion"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Scroll Indicator */}
                        <div className="relative w-full h-1 bg-dark/50 rounded-full mt-2 overflow-hidden">
                            <div
                                id="scroll-indicator"
                                className="absolute top-0 h-full bg-primary/60 rounded-full transition-all duration-150"
                                style={{
                                    width: '30%',
                                    left: '0%'
                                }}
                            />
                        </div>

                        {/* Scroll Buttons */}
                        <button
                            onClick={() => {
                                const container = document.getElementById('boarding-scroll');
                                if (container) container.scrollLeft -= 200;
                            }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 bg-dark/90 hover:bg-dark text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <button
                            onClick={() => {
                                const container = document.getElementById('boarding-scroll');
                                if (container) container.scrollLeft += 200;
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 bg-dark/90 hover:bg-dark text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanionsView;
