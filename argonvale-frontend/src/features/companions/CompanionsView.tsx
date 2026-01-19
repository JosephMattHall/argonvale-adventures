import React, { useState, useEffect } from 'react';
import { Users, ArrowDownUp, RefreshCw } from 'lucide-react';
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

    const activeParty = allCompanions.filter(c => c.is_active);
    const boarding = allCompanions.filter(c => !c.is_active);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <RefreshCw className="animate-spin text-gold" size={48} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6 p-4">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-medieval text-gold flex items-center gap-3">
                    <Users size={32} />
                    Companions Management
                </h2>
                <button
                    onClick={handleSummon}
                    className="btn-gold flex items-center gap-2 shadow-glow-gold px-6"
                >
                    <span>
                        ✨ Summon {allCompanions.length <= 1 ? '(Free!)' : '(500)'}
                    </span>
                </button>
            </div>

            {/* Active Party Section */}
            <div className="glass-panel p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-sm font-bold text-primary uppercase tracking-widest">
                        Active Squad ({activeParty.length}/4)
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {activeParty.map(comp => (
                        <div key={comp.id} className="bg-dark/50 rounded-lg p-4 flex flex-col items-center justify-center border-2 border-primary relative group hover:bg-dark/70 transition-all">
                            <div className="text-4xl mb-2">🐾</div>
                            <div className="font-medieval text-white text-lg">{comp.name}</div>
                            <div className="text-xs text-gray-400 uppercase">{comp.species} • Lvl {comp.level}</div>
                            <div className="mt-2 w-full bg-dark h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-danger h-full"
                                    style={{ width: `${(comp.hp / comp.max_hp) * 100}%` }}
                                ></div>
                            </div>

                            <button
                                onClick={() => handleToggleActive(comp.id)}
                                className="absolute top-2 right-2 p-1 bg-dark/80 rounded hover:bg-danger text-gray-300 hover:text-white transition-all shadow-lg"
                                title="Send to Boarding"
                            >
                                <ArrowDownUp size={18} />
                            </button>
                        </div>
                    ))}
                    {[...Array(Math.max(0, 4 - activeParty.length))].map((_, i) => (
                        <div key={`empty-${i}`} className="border-2 border-dashed border-border-subtle rounded-lg flex items-center justify-center text-gray-600 h-32 italic">
                            Empty Slot
                        </div>
                    ))}
                </div>
            </div>

            {/* Boarding Section */}
            <div className="glass-panel p-6 flex-1 overflow-auto">
                <div className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">
                    Boarding ({boarding.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {boarding.map(comp => (
                        <div key={comp.id} className="bg-dark/30 rounded-lg p-3 flex flex-col items-center justify-center hover:bg-dark/50 border border-border-subtle relative group transition-all">
                            <div className="text-3xl mb-1 opacity-80">🐾</div>
                            <div className="font-medieval text-white text-sm">{comp.name}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-tighter">{comp.species} • Lvl {comp.level}</div>

                            <button
                                onClick={() => handleToggleActive(comp.id)}
                                className="absolute top-1 right-1 p-1 bg-dark/80 rounded hover:bg-success text-gray-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                title="Add to Party"
                            >
                                <ArrowDownUp size={14} />
                            </button>
                        </div>
                    ))}
                    {boarding.length === 0 && (
                        <div className="col-span-full py-8 text-center text-gray-500 italic">
                            No companions in reserve.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompanionsView;
