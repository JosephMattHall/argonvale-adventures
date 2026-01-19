import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companionsApi } from '../../api/companions';
import { Wind, Flame, Droplets, Mountain, Ghost, ArrowLeft } from 'lucide-react';
import { useUser } from '../../context/UserContext';

const OPTIONS = [
    {
        name: "Emberfang",
        type: "Fire",
        description: "Wolf-like ember creature with glowing veins, fast and aggressive.",
        icon: <Flame className="text-orange-500" size={48} />,
        role: "Damage"
    },
    {
        name: "Stoneback Tortoise",
        type: "Earth",
        description: "A sturdy tortoise with a shell made of living rock.",
        icon: <Mountain className="text-stone-500" size={48} />,
        role: "Tank"
    },
    {
        name: "Galehorn Raptor",
        type: "Wind",
        description: "A feathered reptile with hollow bones, moving swift as the wind.",
        icon: <Wind className="text-sky-400" size={48} />,
        role: "Striker"
    },
    {
        name: "Tidemaw Serpent",
        type: "Water",
        description: "A sea-serpent capable of moving on land with a magical water veil.",
        icon: <Droplets className="text-blue-500" size={48} />,
        role: "Bruiser"
    },
    {
        name: "Umbraclaw",
        type: "Shadow",
        description: "A mysterious feline composed of shifting shadows and faint whispers.",
        icon: <Ghost className="text-purple-400" size={48} />,
        role: "Specialist"
    }
];

const CompanionCreation: React.FC = () => {
    const navigate = useNavigate();
    const { refreshProfile } = useUser();
    const [selected, setSelected] = useState<string | null>(null);
    const [showNameModal, setShowNameModal] = useState(false);
    const [companionName, setCompanionName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSelectOption = (name: string) => {
        setSelected(name);
        setShowNameModal(true);
    };

    const handleConfirm = async () => {
        if (!selected || !companionName.trim()) return;

        setLoading(true);
        try {
            const selectedOption = OPTIONS.find(s => s.name === selected);
            if (!selectedOption) return;

            await companionsApi.summon(
                selected,
                companionName.trim(),
                selectedOption.type
            );

            await refreshProfile();
            navigate('/game/companions');
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Failed to create companion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-6 overflow-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-3xl font-medieval text-gold">Companion Creation</h1>
            </div>

            <div className="flex-1 flex flex-col items-center">
                <p className="text-gray-400 mb-8 max-w-2xl text-center">
                    Choose a new ally to join your journey. Each companion has unique strengths and elemental affinities.
                </p>

                <div className="flex gap-4 flex-wrap justify-center max-w-6xl">
                    {OPTIONS.map((s) => (
                        <div
                            key={s.name}
                            onClick={() => handleSelectOption(s.name)}
                            className={`
                                glass-panel w-56 p-6 cursor-pointer transition-all duration-300
                                flex flex-col items-center text-center gap-4
                                ${selected === s.name
                                    ? 'border-primary bg-primary/10 scale-105 shadow-glow'
                                    : 'hover:border-border hover:bg-white/5'}
                            `}
                        >
                            <div className="bg-black/30 p-4 rounded-full">
                                {s.icon}
                            </div>
                            <div>
                                <div className="font-medieval text-lg text-white">{s.name}</div>
                                <div className="text-xs text-gray-400 uppercase tracking-wider">{s.type} • {s.role}</div>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                {s.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Naming Modal */}
            {showNameModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="glass-panel p-8 max-w-md w-full mx-4">
                        <h2 className="text-2xl font-medieval text-gold mb-4">Name Your New Ally</h2>
                        <p className="text-gray-400 mb-6">
                            Give your {selected} a unique and powerful name.
                        </p>

                        <input
                            type="text"
                            value={companionName}
                            onChange={(e) => setCompanionName(e.target.value)}
                            placeholder="Enter companion name..."
                            className="input-field w-full mb-6"
                            maxLength={20}
                            autoFocus
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowNameModal(false);
                                    setCompanionName('');
                                }}
                                className="flex-1 bg-dark-lighter hover:bg-card-hover text-white py-3 rounded-lg transition-colors"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!companionName.trim() || loading}
                                className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanionCreation;
