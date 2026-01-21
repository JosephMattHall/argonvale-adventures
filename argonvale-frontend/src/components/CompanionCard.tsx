import React from 'react';
import type { Companion } from '../api/profiles';
import { Heart, Swords, Shield, Zap } from 'lucide-react';

interface CompanionCardProps {
    companion: Companion;
    action?: {
        label: string;
        onClick: (c: Companion) => void;
        icon?: React.ReactNode;
    };
}

const ELEMENT_COLORS: Record<string, string> = {
    Fire: 'bg-red-500',
    Water: 'bg-blue-500',
    Earth: 'bg-green-500',
    Wind: 'bg-cyan-500',
    Shadow: 'bg-purple-500'
};

const CompanionCard: React.FC<CompanionCardProps> = ({ companion, action }) => {
    const elementColor = ELEMENT_COLORS[companion.element] || 'bg-gray-500';

    return (
        <div className="glass-panel p-4 hover:bg-card-hover transition-all duration-200">
            {/* Image Placeholder */}
            <div className="w-full aspect-square bg-dark rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                <img
                    src={`/companions/${companion.image_url}`}
                    alt={companion.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src.includes('default_companion.png')) return;
                        target.src = '/companions/default_companion.png';
                    }}
                />
            </div>

            {/* Name */}
            <h3 className="font-medieval text-lg text-white mb-1">{companion.name}</h3>

            {/* Species */}
            <p className="text-sm text-gray-400 mb-2">{companion.species}</p>

            {/* Element Badge */}
            <div className="flex items-center gap-2 mb-3">
                <span className={`${elementColor} text-white text-xs font-bold px-2 py-1 rounded`}>
                    {companion.element}
                </span>
                <span className="text-xs text-gray-400">Lv. {companion.level}</span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                    <Heart size={14} className="text-red-400" />
                    <span className="text-gray-300">{companion.hp}/{companion.max_hp}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Swords size={14} className="text-orange-400" />
                    <span className="text-gray-300">{companion.strength}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Shield size={14} className="text-blue-400" />
                    <span className="text-gray-300">{companion.defense}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Zap size={14} className="text-yellow-400" />
                    <span className="text-gray-300">{companion.speed}</span>
                </div>
            </div>

            {action && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        action.onClick(companion);
                    }}
                    className="w-full mt-4 btn-primary py-2 text-xs flex items-center justify-center gap-2"
                >
                    {action.icon}
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default CompanionCard;
