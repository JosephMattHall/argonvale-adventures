import React, { useState, useEffect } from 'react';
import { Dumbbell, TrendingUp, Heart } from 'lucide-react';
import { companionsApi } from '../../api/companions';
import { trainingApi } from '../../api/training';
import type { Companion } from '../../api/profiles';
import { useUser } from '../../context/UserContext';

const TrainingView: React.FC = () => {
    const { profile, updateProfile } = useUser();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [companions, setCompanions] = useState<Companion[]>([]);
    const [loading, setLoading] = useState(true);
    const [training, setTraining] = useState(false);

    const selectedCompanion = companions.find(c => c.id === selectedId);
    const trainingCost = 100;
    const healingCost = 50;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const companionsData = await companionsApi.getActiveCompanions();
            setCompanions(companionsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTrain = async (stat: string) => {
        if (!selectedCompanion || training) return;

        if (!profile || profile.coins < trainingCost) {
            alert("Not enough coins!");
            return;
        }

        setTraining(true);
        try {
            const result = await trainingApi.trainCompanion(selectedCompanion.id, stat);

            // Update local state
            setCompanions(prev => prev.map(c =>
                c.id === selectedCompanion.id
                    ? { ...c, ...result.companion }
                    : c
            ));

            // Sync with global user context
            updateProfile({ ...profile, coins: result.coins_remaining });

            alert(result.message);
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Training failed');
        } finally {
            setTraining(false);
        }
    };

    const handleHeal = async () => {
        if (!selectedCompanion || training) return;

        if (!profile || profile.coins < healingCost) {
            alert("Not enough coins!");
            return;
        }

        if (selectedCompanion.hp >= selectedCompanion.max_hp) {
            alert("Companion already at full HP!");
            return;
        }

        setTraining(true);
        try {
            const result = await trainingApi.healCompanion(selectedCompanion.id);

            // Update local state
            setCompanions(prev => prev.map(c =>
                c.id === selectedCompanion.id
                    ? { ...c, ...result.companion }
                    : c
            ));

            // Sync with global user context
            updateProfile({ ...profile, coins: result.coins_remaining });

            alert(result.message);
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Healing failed');
        } finally {
            setTraining(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-xl text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex gap-4">
            {/* Roster Selection */}
            <div className="w-1/3 glass-panel p-4 flex flex-col gap-2">
                <h3 className="font-medieval text-lg flex items-center gap-2 mb-2 text-gold">
                    <Dumbbell />
                    Select Trainee
                </h3>
                {companions.length > 0 ? (
                    companions.map(comp => (
                        <div
                            key={comp.id}
                            onClick={() => setSelectedId(comp.id)}
                            className={`
                                p-3 rounded cursor-pointer flex items-center gap-3 border transition-all
                                ${selectedId === comp.id
                                    ? 'bg-primary/20 border-primary'
                                    : 'bg-black/20 border-transparent hover:border-border'}
                            `}
                        >
                            <div className="text-2xl">🐾</div>
                            <div className="flex-1">
                                <div className="font-semibold text-white">{comp.name}</div>
                                <div className="text-xs text-gray-400">Lv. {comp.level} • {comp.species}</div>
                                <div className="text-xs text-gray-500">HP: {comp.hp}/{comp.max_hp}</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-400 py-8">
                        No companions yet. Select a starter first!
                    </div>
                )}
            </div>

            {/* Training Area */}
            <div className="flex-1 glass-panel p-8 flex flex-col items-center justify-center relative">
                {!selectedCompanion ? (
                    <div className="text-gray-400 flex flex-col items-center">
                        <Dumbbell size={48} className="opacity-20 mb-4" />
                        Select a companion to begin training.
                    </div>
                ) : (
                    <div className="w-full max-w-md">
                        <div className="text-center mb-8">
                            <div className="text-6xl mb-4">🐾</div>
                            <h2 className="text-2xl font-medieval text-white">{selectedCompanion.name}</h2>
                            <div className="text-sm text-gray-400 mt-1">{selectedCompanion.species} • Lv. {selectedCompanion.level}</div>

                            {/* HP Bar */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-400">HP</span>
                                    <span className="text-white">{selectedCompanion.hp}/{selectedCompanion.max_hp}</span>
                                </div>
                                <div className="w-full bg-dark-lighter rounded-full h-2">
                                    <div
                                        className="bg-danger h-2 rounded-full transition-all"
                                        style={{ width: `${(selectedCompanion.hp / selectedCompanion.max_hp) * 100}%` }}
                                    ></div>
                                </div>
                                {selectedCompanion.hp < selectedCompanion.max_hp && (
                                    <button
                                        onClick={handleHeal}
                                        disabled={training}
                                        className="mt-2 bg-success hover:bg-success-dark text-white px-4 py-1 rounded text-sm disabled:opacity-50"
                                    >
                                        <Heart size={14} className="inline mr-1" />
                                        Heal ({healingCost} coins)
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { key: 'strength', label: 'STR', value: selectedCompanion.strength },
                                { key: 'defense', label: 'DEF', value: selectedCompanion.defense },
                                { key: 'speed', label: 'SPD', value: selectedCompanion.speed },
                                { key: 'hp', label: 'MAX HP', value: selectedCompanion.max_hp }
                            ].map(stat => (
                                <div key={stat.key} className="glass-panel p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/10 p-2 rounded">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <div className="uppercase text-xs text-gray-400 font-bold">{stat.label}</div>
                                            <div className="text-xl font-mono text-white">{stat.value}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleTrain(stat.key)}
                                        disabled={training}
                                        className="btn-primary py-2 px-6 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        Train <span className="text-xs opacity-70">(-{trainingCost})</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainingView;
