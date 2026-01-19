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
    tileSize: number;
    tileset: string;
    layers: {
        ground: number[];
        objects: number[];
        collision: number[];
    };
}


const ExplorationView: React.FC = () => {
    const { profile, updateProfile } = useUser();
    const navigate = useNavigate();
    const { sendCommand, isConnected, messages } = useGameSocket();

    // State
    const [currentZoneId, setCurrentZoneId] = useState<string>(profile?.last_zone_id || 'town');
    const [mapData, setMapData] = useState<TilemapData | null>(null);
    const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
    const [playerPos, setPlayerPos] = useState({ x: profile?.last_x ?? 8, y: profile?.last_y ?? 8 });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const playerPosRef = useRef(playerPos);
    const lastMoveTimeRef = useRef(0);
    const mapDataRef = useRef<TilemapData | null>(null);

    // Initial Load & Zone Change
    useEffect(() => {
        const loadMap = async () => {
            try {
                // Load Map JSON
                const res = await fetch(`/maps/${currentZoneId}.json`);
                if (!res.ok) throw new Error("Map not found");
                const data: TilemapData = await res.json();
                setMapData(data);
                mapDataRef.current = data;

                // Load Tileset Image
                const img = new Image();
                img.src = '/tilesets/world_tileset.png'; // Hardcoded for now based on generator
                img.onload = () => {
                    console.log("Tileset loaded successfully");
                    setTilesetImage(img);
                };
                img.onerror = (e) => console.error("Tileset failed to load", e);

                // Reset position if changed zones explicitly (not initial load)
                if (currentZoneId !== profile?.last_zone_id) {
                    setPlayerPos({ x: Math.floor(data.width / 2), y: Math.floor(data.height / 2) });
                }
                console.log("Map Loaded:", data);
            } catch (err) {
                console.error("Failed to load map:", err);
            }
        };
        loadMap();
    }, [currentZoneId, profile]);

    // Listen for Encounters
    // Capture initial message count on mount using LAZY initialization to avoid processing old messages
    const [initialMsgCount, setInitialMsgCount] = useState(() => messages.length);

    useEffect(() => {
        if (messages.length <= initialMsgCount) return;

        // Scan ALL new messages, not just the last one
        const newMessages = messages.slice(initialMsgCount);
        const encounterEvent = newMessages.find((msg: any) =>
            msg.type === 'CombatStarted' &&
            msg.attacker_id === profile?.id &&
            msg.mode === 'pve'
        );

        if (encounterEvent) {
            // Update our message count tracker so we don't re-process this event
            // But we probably will unmount anyway.
            setInitialMsgCount(messages.length);

            // Auto-navigate to Battle Selection Screen with Context
            navigate('/game/battle-select', {
                state: {
                    encounterContext: encounterEvent.context,
                    combatId: encounterEvent.combat_id,
                    origin: 'exploration'
                }
            });
        }
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
    }, []);

    // Sync Ref
    useEffect(() => {
        playerPosRef.current = playerPos;
    }, [playerPos]);

    // Resize Handler
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Helper: Collision Check
    const isSolid = (x: number, y: number) => {
        if (!mapDataRef.current) return true;
        const { width, height, layers } = mapDataRef.current;
        if (x < 0 || x >= width || y < 0 || y >= height) return true;
        return layers.collision[y * width + x] === 1;
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
            // Blocked
            // Could add "bump" sound or animation here
            return;
        }

        lastMoveTimeRef.current = now;
        setPlayerPos({ x: nextX, y: nextY });

        if (profile) {
            updateProfile({
                ...profile,
                last_x: nextX,
                last_y: nextY,
                last_zone_id: currentZoneId
            });
        }

        sendCommand({
            type: "Move",
            direction: { dx, dy },
            zone_id: currentZoneId
        });
    };

    // Render Loop
    useEffect(() => {
        if (!canvasRef.current || !mapData || !tilesetImage) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Constants using dynamic cell size based on screen
        // We use constant TILE_SIZE (48px) for rendering clarity, scaled by CSS if needed
        const renderTileSize = TILE_SIZE;
        const viewportW = isMobile ? 10 : VIEWPORT_TILES;
        const viewportH = isMobile ? 10 : VIEWPORT_TILES;

        canvasRef.current.width = viewportW * renderTileSize;
        canvasRef.current.height = viewportH * renderTileSize;

        // Camera Top-Left logic (centered on player)
        let camX = playerPos.x - Math.floor(viewportW / 2);
        let camY = playerPos.y - Math.floor(viewportH / 2);

        // Clamp Camera
        camX = Math.max(0, Math.min(mapData.width - viewportW, camX));
        camY = Math.max(0, Math.min(mapData.height - viewportH, camY));

        ctx.fillStyle = '#1e293b'; // Dark background
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Define Tile SourceRect in Tileset (assuming 5 columns for now based on generator logic)
        // Generator used IDs: 1=Grass, 6=Water, 11=Path, 16=Wall, 21=Tree
        // This implies width of at least 5. Let's assume the image is 5 tiles wide (240px).
        // If image is wider, we need to know. For now, assuming 5 cols.
        const APP_TILES_ROW_COUNT = 5;

        const drawTile = (tileId: number, screenX: number, screenY: number) => {
            if (tileId === 0) return; // Empty
            // Adjust ID if 1-indexed? Python script used 1-based logic (1=Grass) but array index 0?
            // Python used 1... 
            // Let's assume generated image top-left is ID 0.
            // Python script used: GRASS=1. So if index is 1.
            // Source X/Y
            const srcX = (tileId % APP_TILES_ROW_COUNT) * 48;
            const srcY = Math.floor(tileId / APP_TILES_ROW_COUNT) * 48;

            ctx.drawImage(tilesetImage,
                srcX, srcY, 48, 48, // Source
                screenX, screenY, renderTileSize, renderTileSize // Dest
            );
        };

        // Render Layers
        for (let y = 0; y < viewportH; y++) {
            for (let x = 0; x < viewportW; x++) {
                const worldX = camX + x;
                const worldY = camY + y;
                const idx = worldY * mapData.width + worldX;

                // 1. Ground
                if (idx < mapData.layers.ground.length) {
                    drawTile(mapData.layers.ground[idx], x * renderTileSize, y * renderTileSize);
                }

                // 2. Objects (Under Player)
                // In top-down, objects usually render AFTER player if y > player.y
                // For simplicity, let's render objects here. 
                // Z-Sorting is huge improvement but tricky in simple loop.
                // We'll render objects "flat" for now. A tree you stand ON TOP of looks weird.
                // Usually we render: Ground -> Player -> Overhead (Roof/TreeTop)
                // Or: Ground -> [Sorted Entities]
                if (mapData.layers.objects[idx] !== 0) {
                    drawTile(mapData.layers.objects[idx], x * renderTileSize, y * renderTileSize);
                }
            }
        }

        // Render Player
        const playerScreenX = (playerPos.x - camX) * renderTileSize;
        const playerScreenY = (playerPos.y - camY) * renderTileSize;

        ctx.font = `${renderTileSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(playerScreenX + renderTileSize / 2, playerScreenY + renderTileSize - 5, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Icon
        ctx.fillStyle = '#8b5cf6'; // Primary Purple
        ctx.fillText('👤', playerScreenX + renderTileSize / 2, playerScreenY + renderTileSize / 2);

    }, [mapData, tilesetImage, playerPos, isMobile]);

    if (!mapData) return <div className="text-center p-10 text-gold font-medieval animate-pulse">Loading Map Realm...</div>;

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
