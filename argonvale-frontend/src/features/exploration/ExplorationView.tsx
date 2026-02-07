import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Navigation } from 'lucide-react';
import { useGameSocket } from '../../hooks/useGameSocket';
import { useUser } from '../../context/UserContext';

// Tilemap Configuration
const VIEWPORT_TILES = 15; // 15x15 tiles visible
const TILE_SIZE = 48; // Display size (pixels)

interface TilemapData {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    layers: Array<{
        name: string;
        type: string;
        data?: number[];
        visible?: boolean;
        opacity?: number;
    }>;
    tilesets: Array<{
        firstgid: number;
        image: string;
        name: string;
    }>;
}


const ExplorationView: React.FC = () => {
    const { profile, updateProfile, loading } = useUser();
    const navigate = useNavigate();
    const { sendCommand, isConnected, messages } = useGameSocket();

    // State
    const [currentZoneId, setCurrentZoneId] = useState<string>(profile?.last_zone_id || 'town');
    const [otherPlayers, setOtherPlayers] = useState<Record<number, { x: number, y: number, username: string }>>({});

    // Sync zone and position state after profile loads (fixes race condition)
    useEffect(() => {
        if (!loading && profile) {
            if (profile.last_zone_id) setCurrentZoneId(profile.last_zone_id);
            if (profile.last_x !== undefined && profile.last_y !== undefined) {
                setPlayerPos({ x: profile.last_x, y: profile.last_y });
            }
        }
    }, [loading, profile]);
    const [mapData, setMapData] = useState<TilemapData | null>(null);
    const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
    const [playerPos, setPlayerPos] = useState({ x: profile?.last_x ?? 8, y: profile?.last_y ?? 8 });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const playerPosRef = useRef(playerPos);
    const currentZoneIdRef = useRef(currentZoneId); // New Ref
    const lastMoveTimeRef = useRef(0);
    const mapDataRef = useRef<TilemapData | null>(null);

    // Helper: Collision Check
    const isSolid = (x: number, y: number) => {
        if (!mapDataRef.current) return true;
        const { width, height, layers } = mapDataRef.current;
        if (x < 0 || x >= width || y < 0 || y >= height) return true;

        const collisionLayer = layers.find(l => l.name === 'collision');
        if (!collisionLayer || !collisionLayer.data) return false;

        return collisionLayer.data[y * width + x] !== 0; // Tiled: 0 is empty, anything else is a tile ID
    };

    // Movement Logic
    const move = (dx: number, dy: number) => {
        const now = Date.now();
        if (now - lastMoveTimeRef.current < 150) return;

        const currentPos = playerPosRef.current;
        const nextX = currentPos.x + dx;
        const nextY = currentPos.y + dy;

        if (isSolid(nextX, nextY)) {
            console.log("Movement Blocked at:", nextX, nextY);
            return;
        }

        lastMoveTimeRef.current = now;
        setPlayerPos({ x: nextX, y: nextY });

        if (profile) {
            updateProfile({
                ...profile,
                last_x: nextX,
                last_y: nextY,
                last_zone_id: currentZoneIdRef.current
            });
        }

        sendCommand({
            type: "Move",
            x: nextX,
            y: nextY,
            direction: { dx, dy },
            zone_id: currentZoneIdRef.current
        });
    };




    // Initial Load & Zone Change
    useEffect(() => {
        const loadMap = async () => {
            try {
                // Clear other players when changing zones
                setOtherPlayers({});

                // Load Map JSON
                const res = await fetch(`/maps/${currentZoneId}.json`);
                if (!res.ok) throw new Error("Map not found");
                const data: TilemapData = await res.json();
                setMapData(data);
                mapDataRef.current = data; // Immedate ref update for validation

                // Load Tileset Image
                const img = new Image();
                img.src = '/tilesets/world_tileset.png'; // Hardcoded for now based on generator
                img.onload = () => {
                    console.log("Tileset loaded successfully");
                    setTilesetImage(img);
                };
                img.onerror = (e) => console.error("Tileset failed to load", e);

                // --- Position Validation Logic ---
                let safeX = playerPos.x;
                let safeY = playerPos.y;
                let needsReset = false;

                if (safeX < 0 || safeX >= data.width || safeY < 0 || safeY >= data.height) {
                    needsReset = true;
                } else {
                    const idx = safeY * data.width + safeX;
                    const collisionLayer = data.layers.find(l => l.name === 'collision');
                    if (collisionLayer && collisionLayer.data && collisionLayer.data[idx] !== 0) {
                        needsReset = true;
                    }
                }

                if (needsReset) {
                    safeX = Math.floor(data.width / 2);
                    safeY = Math.floor(data.height / 2);
                    setPlayerPos({ x: safeX, y: safeY });
                    if (profile) {
                        updateProfile({
                            ...profile,
                            last_x: safeX,
                            last_y: safeY,
                            last_zone_id: currentZoneId
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to load map:", err);
            }
        };
        loadMap();
    }, [currentZoneId]);

    // Listen for Messages
    const [initialMsgCount, setInitialMsgCount] = useState(() => messages.length);

    useEffect(() => {
        if (messages.length <= initialMsgCount) return;

        const newMessages = messages.slice(initialMsgCount);
        setInitialMsgCount(messages.length);

        newMessages.forEach((msg: any) => {
            // 1. PvE Encounters
            if (msg.type === 'CombatStarted' && msg.attacker_id == profile?.id && msg.mode === 'pve') {
                navigate('/game/battle-select', {
                    state: {
                        encounterContext: msg.context,
                        combatId: msg.combat_id,
                        origin: 'exploration'
                    }
                });
            }

            // 2. Multiplayer Movement
            if (msg.type === 'PlayerMoved' && msg.player_id != profile?.id) {
                setOtherPlayers(prev => ({
                    ...prev,
                    [msg.player_id]: { x: msg.x, y: msg.y, username: msg.username }
                }));
            }

            // 3. Disconnections
            if (msg.type === 'PlayerDisconnected') {
                setOtherPlayers(prev => {
                    const next = { ...prev };
                    delete next[msg.player_id];
                    return next;
                });
            }

            // 4. Teleport (Server Sync Correction)
            if (msg.type === 'TeleportPlayer') {
                setPlayerPos({ x: msg.x, y: msg.y });
                // If zone changed, update that too
                if (msg.zone_id && msg.zone_id !== currentZoneIdRef.current) {
                    setCurrentZoneId(msg.zone_id);
                }
            }
        });
    }, [messages, initialMsgCount, profile, navigate]);

    // Handle Input
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
    }, [move]);

    // Sync Refs
    useEffect(() => {
        playerPosRef.current = playerPos;
    }, [playerPos]);

    useEffect(() => {
        currentZoneIdRef.current = currentZoneId;
    }, [currentZoneId]);

    // Resize Handler
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Render Loop
    useEffect(() => {
        if (!canvasRef.current || !mapData || !tilesetImage) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const renderTileSize = TILE_SIZE;
        const viewportW = isMobile ? 10 : VIEWPORT_TILES;
        const viewportH = isMobile ? 10 : VIEWPORT_TILES;

        canvasRef.current.width = viewportW * renderTileSize;
        canvasRef.current.height = viewportH * renderTileSize;

        let camX = playerPos.x - Math.floor(viewportW / 2);
        let camY = playerPos.y - Math.floor(viewportH / 2);

        camX = Math.max(0, Math.min(mapData.width - viewportW, camX));
        camY = Math.max(0, Math.min(mapData.height - viewportH, camY));

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        const APP_TILES_ROW_COUNT = 5;

        const drawTile = (tileId: number, screenX: number, screenY: number) => {
            if (tileId === 0) return;
            const srcX = (tileId % APP_TILES_ROW_COUNT) * 48;
            const srcY = Math.floor(tileId / APP_TILES_ROW_COUNT) * 48;

            ctx.drawImage(tilesetImage,
                srcX, srcY, 48, 48,
                screenX, screenY, renderTileSize, renderTileSize
            );
        };

        // Render Map
        for (let y = 0; y < viewportH; y++) {
            for (let x = 0; x < viewportW; x++) {
                const worldX = camX + x;
                const worldY = camY + y;

                // Bounds check
                if (worldX < 0 || worldX >= mapData.width || worldY < 0 || worldY >= mapData.height) continue;

                const idx = worldY * mapData.width + worldX;

                // Iterate layers
                for (const layer of mapData.layers) {
                    if (layer.type === 'tilelayer' && layer.visible !== false && layer.data) {
                        // Skip collision layer for visual rendering usually, or render debug
                        if (layer.name === 'collision') continue;

                        const tileId = layer.data[idx];
                        if (tileId !== 0) {
                            drawTile(tileId, x * renderTileSize, y * renderTileSize);
                        }
                    }
                }
            }
        }

        // Render Other Players
        Object.entries(otherPlayers).forEach(([, p]) => {
            const screenX = (p.x - camX) * renderTileSize;
            const screenY = (p.y - camY) * renderTileSize;

            if (screenX >= -TILE_SIZE && screenX < canvasRef.current!.width && screenY >= -TILE_SIZE && screenY < canvasRef.current!.height) {
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(screenX + renderTileSize / 2, screenY + renderTileSize - 5, 8, 4, 0, 0, Math.PI * 2);
                ctx.fill();

                // Character
                ctx.font = `${renderTileSize * 0.8}px serif`;
                ctx.fillText('👤', screenX + renderTileSize / 2, screenY + renderTileSize / 2);

                // Name Tag
                ctx.font = 'bold 10px Inter, sans-serif';
                ctx.fillStyle = 'white';
                ctx.fillText(p.username, screenX + renderTileSize / 2, screenY - 5);
            }
        });

        // Render Local Player
        const playerScreenX = (playerPos.x - camX) * renderTileSize;
        const playerScreenY = (playerPos.y - camY) * renderTileSize;

        ctx.font = `${renderTileSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(playerScreenX + renderTileSize / 2, playerScreenY + renderTileSize - 5, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b5cf6';
        ctx.fillText('👤', playerScreenX + renderTileSize / 2, playerScreenY + renderTileSize / 2);

    }, [mapData, tilesetImage, playerPos, isMobile, otherPlayers]);

    if (loading || !mapData) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-10 text-gold font-medieval animate-pulse">
                    {loading ? 'Consulting the Stars...' : 'Loading Map Realm...'}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-2 sm:p-4">
            <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-xl sm:text-2xl font-medieval text-gold flex items-center gap-2">
                    <Navigation className="animate-pulse" size={isMobile ? 18 : 24} />
                    {currentZoneId === 'town' ? 'Starter Town' : 'Wilderness'}
                </h2>
                <div className="flex gap-2">
                    <div className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border ${isConnected ? 'bg-success/10 border-success/30 text-success' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                        {isConnected ? 'ONLINE' : 'OFFLINE'}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
                <div className="flex-1 glass-panel p-2 flex items-center justify-center bg-black/40 relative min-h-[350px]">
                    <canvas
                        ref={canvasRef}
                        className="rounded-lg shadow-2xl border-2 border-white/10"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            imageRendering: 'pixelated'
                        }}
                    />
                </div>

                <div className="w-full lg:w-72 space-y-4">
                    <div className="glass-panel p-5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Zone Travel</label>
                        <select
                            className="w-full bg-dark/60 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
                            value={currentZoneId}
                            onChange={(e) => {
                                const newZone = e.target.value;
                                setCurrentZoneId(newZone);
                                if (profile) {
                                    updateProfile({ ...profile, last_zone_id: newZone });
                                }
                            }}
                        >
                            <option value="town">🏡 Starter Town</option>
                            <option value="wild">🌲 The Wilderness</option>
                        </select>
                        <p className="mt-4 text-xs text-gray-400 italic">
                            {currentZoneId === 'town'
                                ? "A safe haven. No monsters here."
                                : "Dangerous lands. Tread carefully."}
                        </p>
                    </div>

                    {isMobile && (
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
                                <span>COORD: {playerPos.x}, {playerPos.y}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExplorationView;
