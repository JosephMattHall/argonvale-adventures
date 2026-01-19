import React, { useEffect, useState, useRef } from 'react';
import { MapPin, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Navigation } from 'lucide-react';
import { useGameSocket } from '../../hooks/useGameSocket';
import { useUser } from '../../context/UserContext';
import townMap from '../../assets/maps/town_map.jpg';
import wildMap from '../../assets/maps/wild_map.jpg';

interface WorldObject {
    id: string;
    type: 'tree' | 'house' | 'pillar' | 'rock';
    x: number;
    y: number;
    width: number;
    height: number;
    icon: string;
    isSolid: boolean;
}

interface Zone {
    id: string;
    name: string;
    gridSize: number;
    image: string;
    dangerLevel: number;
    description: string;
    objects: WorldObject[];
}

const ZONES: Record<string, Zone> = {
    town: {
        id: 'town',
        name: 'Starter Town',
        gridSize: 20,
        image: townMap,
        dangerLevel: 0,
        description: 'A peaceful safe haven. Prepare for your journey here.',
        objects: [
            { id: 'h1', type: 'house', x: 5, y: 5, width: 3, height: 2, icon: '🏠', isSolid: true },
            { id: 'h2', type: 'house', x: 12, y: 8, width: 3, height: 2, icon: '🏘️', isSolid: true },
            { id: 't1', type: 'tree', x: 3, y: 3, width: 1, height: 1, icon: '🌳', isSolid: true },
            { id: 't2', type: 'tree', x: 4, y: 3, width: 1, height: 1, icon: '🌲', isSolid: true },
            { id: 't3', type: 'tree', x: 3, y: 4, width: 1, height: 1, icon: '🌳', isSolid: true },
            { id: 'p1', type: 'pillar', x: 10, y: 10, width: 1, height: 1, icon: '🏛️', isSolid: true },
        ]
    },
    wild: {
        id: 'wild',
        name: 'Wilderness',
        gridSize: 60,
        image: wildMap,
        dangerLevel: 3,
        description: 'A dangerous expanse filled with wild creatures.',
        objects: [
            { id: 'wt1', type: 'tree', x: 10, y: 10, width: 1, height: 1, icon: '🌲', isSolid: true },
            { id: 'wt2', type: 'tree', x: 11, y: 11, width: 1, height: 1, icon: '🌲', isSolid: true },
            { id: 'wr1', type: 'rock', x: 15, y: 15, width: 1, height: 1, icon: '🪨', isSolid: true },
        ]
    }
};

const VIEWPORT_SIZE = 14;
const CELL_SIZE = 48;

const ExplorationView: React.FC = () => {
    const { profile } = useUser();
    const [currentZoneId, setCurrentZoneId] = useState<string>(profile?.last_zone_id || 'town');
    const [playerPos, setPlayerPos] = useState({
        x: profile?.last_x ?? 8,
        y: profile?.last_y ?? 8
    });

    const playerPosRef = useRef(playerPos);
    const zoneRef = useRef(ZONES[currentZoneId]);
    const { sendCommand, isConnected } = useGameSocket();

    useEffect(() => {
        if (profile) {
            setCurrentZoneId(profile.last_zone_id || 'town');
            setPlayerPos({ x: profile.last_x ?? 8, y: profile.last_y ?? 8 });
        }
    }, [profile]);

    useEffect(() => {
        playerPosRef.current = playerPos;
    }, [playerPos]);

    useEffect(() => {
        zoneRef.current = ZONES[currentZoneId];
        if (currentZoneId !== profile?.last_zone_id) {
            const z = ZONES[currentZoneId];
            setPlayerPos({ x: Math.floor(z.gridSize / 2), y: Math.floor(z.gridSize / 2) });
        }
    }, [currentZoneId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyS", "KeyA", "KeyD"].includes(e.code)) {
                e.preventDefault();
            }

            let dx = 0, dy = 0;
            if (e.code === 'ArrowUp' || e.code === 'KeyW') dy = -1;
            else if (e.code === 'ArrowDown' || e.code === 'KeyS') dy = 1;
            else if (e.code === 'ArrowLeft' || e.code === 'KeyA') dx = -1;
            else if (e.code === 'ArrowRight' || e.code === 'KeyD') dx = 1;

            if (dx !== 0 || dy !== 0) move(dx, dy);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const isColliding = (x: number, y: number, zone: Zone) => {
        return zone.objects.some(obj => {
            if (!obj.isSolid) return false;
            return x >= obj.x && x < obj.x + obj.width &&
                y >= obj.y && y < obj.y + obj.height;
        });
    };

    const move = (dx: number, dy: number) => {
        const currentZone = zoneRef.current;
        const currentPos = playerPosRef.current;

        const nextX = Math.max(0, Math.min(currentZone.gridSize - 1, currentPos.x + dx));
        const nextY = Math.max(0, Math.min(currentZone.gridSize - 1, currentPos.y + dy));

        if (nextX === currentPos.x && nextY === currentPos.y) return;

        // Collision Check
        if (isColliding(nextX, nextY, currentZone)) {
            // Shake effect or sound? Handled by UI feedback if needed
            return;
        }

        setPlayerPos({ x: nextX, y: nextY });
        sendCommand({
            type: "Move",
            direction: { dx, dy },
            zone_id: currentZone.id
        });
    };

    const zone = ZONES[currentZoneId];
    const viewportPx = VIEWPORT_SIZE * CELL_SIZE;

    let cameraX = (VIEWPORT_SIZE / 2 - playerPos.x - 0.5) * CELL_SIZE;
    let cameraY = (VIEWPORT_SIZE / 2 - playerPos.y - 0.5) * CELL_SIZE;

    const minTranslateX = -1 * (zone.gridSize - VIEWPORT_SIZE) * CELL_SIZE;
    const minTranslateY = -1 * (zone.gridSize - VIEWPORT_SIZE) * CELL_SIZE;

    cameraX = Math.min(0, Math.max(minTranslateX, cameraX));
    cameraY = Math.min(0, Math.max(minTranslateY, cameraY));

    // Y-Sorting Renderable Entities
    // We combine player and objects into one list and sort by y
    const entities = [
        ...zone.objects.map(obj => ({ ...obj, isPlayer: false })),
        { id: 'player', type: 'player', x: playerPos.x, y: playerPos.y, width: 1, height: 1, icon: '👤', isPlayer: true }
    ].sort((a, b) => {
        // Sort by bottom Y coordinate
        const ay = a.isPlayer ? a.y : a.y + a.height - 1;
        const by = b.isPlayer ? b.y : b.y + b.height - 1;
        return ay - by;
    });

    return (
        <div className="h-full flex flex-col p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-medieval text-gold flex items-center gap-2">
                    <Navigation className="animate-pulse" /> {zone.name}
                </h2>
                <div className="flex gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isConnected ? 'bg-success/10 border-success/30 text-success' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                        {isConnected ? 'ONLINE' : 'OFFLINE'}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
                <div className="flex-1 glass-panel p-2 flex items-center justify-center bg-black/40 relative overflow-hidden min-h-[400px]">
                    {/* Viewport Overlay Effects */}
                    <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-t from-black/20 to-transparent" />

                    <div
                        style={{ width: viewportPx, height: viewportPx }}
                        className="relative overflow-hidden rounded-xl border-2 border-white/5 shadow-2xl bg-dark/20"
                    >
                        {/* Map Surface */}
                        <div
                            style={{
                                width: zone.gridSize * CELL_SIZE,
                                height: zone.gridSize * CELL_SIZE,
                                backgroundImage: `url(${zone.image})`,
                                backgroundSize: 'cover',
                                transform: `translate(${cameraX}px, ${cameraY}px)`,
                                transition: 'transform 0.2s ease-out',
                                position: 'absolute',
                            }}
                        >
                            {/* Grid Dots */}
                            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px` }} />

                            {/* Entity Layer (Sorted) */}
                            {entities.map((ent: any) => {
                                // Depth effect: transparency if player is "behind"
                                const isBehind = !ent.isPlayer && playerPos.x >= ent.x && playerPos.x < ent.x + ent.width && playerPos.y === ent.y - 1;
                                const isOverlapping = !ent.isPlayer && playerPos.x >= ent.x && playerPos.x < ent.x + ent.width && playerPos.y >= ent.y && playerPos.y < ent.y + ent.height;

                                return (
                                    <div
                                        key={ent.id}
                                        className={`absolute flex items-center justify-center transition-all duration-300 ${ent.isPlayer ? 'z-20' : ''}`}
                                        style={{
                                            width: ent.width * CELL_SIZE,
                                            height: ent.height * CELL_SIZE,
                                            transform: `translate(${ent.x * CELL_SIZE}px, ${ent.y * CELL_SIZE}px)`,
                                            fontSize: ent.isPlayer ? '2rem' : `${ent.width * 1.5}rem`,
                                            opacity: (isBehind || isOverlapping) ? 0.6 : 1,
                                            filter: ent.isPlayer ? 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none'
                                        }}
                                    >
                                        <div className={ent.isPlayer ? 'animate-bounce' : ''}>
                                            {ent.icon || (ent.isPlayer ? <MapPin size={CELL_SIZE} className="text-primary" /> : '❓')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-72 space-y-4 overflow-y-auto lg:overflow-visible pb-4 lg:pb-0">
                    <div className="glass-panel p-5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Zone Travel</label>
                        <select
                            className="w-full bg-dark/60 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
                            value={currentZoneId}
                            onChange={(e) => setCurrentZoneId(e.target.value)}
                        >
                            <option value="town">🏡 Starter Town</option>
                            <option value="wild">🌲 The Wilderness</option>
                        </select>

                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-xs font-mono">
                                <span className="text-gray-500 uppercase">Danger</span>
                                <span className="text-red-400">{'★'.repeat(zone.dangerLevel)}</span>
                            </div>
                            <p className="text-xs text-gray-400 italic leading-relaxed">
                                {zone.description}
                            </p>
                        </div>
                    </div>

                    <div className="glass-panel p-5 flex flex-col items-center">
                        <div className="grid grid-cols-3 gap-2">
                            <div />
                            <button onClick={() => move(0, -1)} className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all outline-none border border-white/5"><ArrowUp size={20} /></button>
                            <div />
                            <button onClick={() => move(-1, 0)} className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all outline-none border border-white/5"><ArrowLeft size={20} /></button>
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-gray-600 bg-black/20"><Navigation size={18} /></div>
                            <button onClick={() => move(1, 0)} className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all outline-none border border-white/5"><ArrowRight size={20} /></button>
                            <div />
                            <button onClick={() => move(0, 1)} className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all outline-none border border-white/5"><ArrowDown size={20} /></button>
                            <div />
                        </div>
                        <div className="mt-6 text-[10px] font-mono text-gray-500 flex gap-4 uppercase">
                            <span>GRID: {zone.gridSize}x{zone.gridSize}</span>
                            <span className="text-primary">X:{playerPos.x} Y:{playerPos.y}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExplorationView;
