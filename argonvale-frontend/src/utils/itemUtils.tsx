import React from 'react';
import { Sword, Shield, Sparkles, Snowflake, EyeOff, Heart, Zap, RotateCcw } from 'lucide-react';

export interface ParsedStats {
    atk?: { [element: string]: number };
    def?: { [element: string]: number };
    heal?: number;
    heal_pct?: number;
}

export const parseItemStats = (item: any): ParsedStats => {
    const stats = item.weapon_stats || item.stats || {};
    const parsed: ParsedStats = {};

    // Standardize Atk
    const rawAtk = stats.attack || stats.atk;
    if (rawAtk) {
        if (typeof rawAtk === 'object') {
            parsed.atk = rawAtk;
        } else {
            parsed.atk = { Phys: rawAtk };
        }
    }

    // Standardize Def
    const rawDef = stats.defense || stats.def;
    if (rawDef) {
        if (typeof rawDef === 'object') {
            parsed.def = rawDef;
        } else {
            parsed.def = { Phys: rawDef };
        }
    }

    // Healing
    if (stats.heal) parsed.heal = stats.heal;
    if (stats.heal_pct) parsed.heal_pct = stats.heal_pct;

    return parsed;
};

export const renderStatBadges = (item: any) => {
    const stats = parseItemStats(item);
    const badges: React.ReactNode[] = [];

    if (stats.atk) {
        Object.entries(stats.atk).forEach(([type, val]) => {
            badges.push(
                <div key={`atk-${type}`} className="flex items-center gap-1 bg-red-950/30 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                    <Sword size={8} /> {val} {type !== 'Phys' ? type : ''}
                </div>
            );
        });
    }

    if (stats.def) {
        Object.entries(stats.def).forEach(([type, val]) => {
            badges.push(
                <div key={`def-${type}`} className="flex items-center gap-1 bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                    <Shield size={8} /> {val} {type !== 'Phys' ? type : ''}
                </div>
            );
        });
    }

    if (stats.heal) {
        badges.push(
            <div key="heal" className="flex items-center gap-1 bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                <Heart size={8} /> +{stats.heal} HP
            </div>
        );
    }

    if (stats.heal_pct) {
        badges.push(
            <div key="heal-pct" className="flex items-center gap-1 bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                <Sparkles size={8} /> {stats.heal_pct}% Heal
            </div>
        );
    }

    // Effect logic is usually separate but let's add a quick one for chance
    if (item.effect?.type) {
        const type = item.effect.type;
        const chance = item.effect.chance ? (item.effect.chance * 100).toFixed(0) + '%' : '';
        const Icon = type === 'freeze' ? Snowflake : type === 'stealth' ? EyeOff : type === 'reflect' ? RotateCcw : Zap;

        badges.push(
            <div key="effect" className="flex items-center gap-1 bg-white/5 text-gray-300 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                <Icon size={8} className={type === 'freeze' ? 'text-cyan-400' : type === 'stealth' ? 'text-purple-400' : 'text-orange-400'} /> {chance || type}
            </div>
        );
    }

    return badges;
};
