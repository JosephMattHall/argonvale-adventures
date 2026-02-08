import json
import os
import logging
from pspf.processors.exploration import ExplorationProcessor
from pspf.events.base import GameEvent

logger = logging.getLogger("argonvale")

# Path to data (Adjust to match your project structure)
# In standard pspf, it looks in app/data/maps. 
# We will point this to where we expect the Tiled maps to be.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__))) # argonvale-backend root
MAPS_DIR = os.path.join(BASE_DIR, "../argonvale-frontend/public/maps") # Using frontend public maps

class TiledExplorationProcessor(ExplorationProcessor):
    def __init__(self, maps_dir=None):
        self.custom_maps_dir = maps_dir or MAPS_DIR
        super().__init__()
        # Re-load data to ensure we use formatting from Tiled
        self._load_tiled_data()

    def _load_tiled_data(self):
        """Override data loading to parse Tiled JSON format"""
        self.maps_data = {}
        
        if os.path.exists(self.custom_maps_dir):
            logger.info(f"Loading Tiled maps from {self.custom_maps_dir}")
            for filename in os.listdir(self.custom_maps_dir):
                if filename.endswith(".json") or filename.endswith(".tmj"):
                    map_id = filename.replace(".json", "").replace(".tmj", "")
                    try:
                        with open(os.path.join(self.custom_maps_dir, filename), 'r') as f:
                            tiled_data = json.load(f)
                            self.maps_data[map_id] = self._parse_tiled_map(tiled_data)
                            logger.info(f"Loaded map: {map_id} ({filename})")
                    except Exception as e:
                        logger.error(f"Failed to load map {map_id}: {e}")
        else:
             logger.warning(f"Maps directory not found: {self.custom_maps_dir}")

    def _parse_tiled_map(self, tiled_data):
        """
        Convert Tiled JSON (Linear array of layers) into an optimized lookup structure
        for server-side validation.
        """
        parsed = {
            "width": tiled_data["width"],
            "height": tiled_data["height"],
            "collision_mask": set(), # Set of (x, y) tuples
            "warps": [] # List of {rect, target_zone, target_x, target_y}
        }
        
        layers = tiled_data.get("layers", [])
        width = tiled_data["width"]
        
        for layer in layers:
            # 1. Collision Layer
            if layer["type"] == "tilelayer":
                lname = layer["name"].lower()
                # Check for "collision" name OR custom property "collision"
                is_collision = lname == "collision"
                
                # Check custom properties
                if not is_collision and "properties" in layer:
                    for prop in layer["properties"]:
                        if prop["name"] == "collision" and prop["value"] == True:
                            is_collision = True
                            break
                
                if is_collision and "data" in layer:
                    data = layer["data"]
                    for idx, gid in enumerate(data):
                        if gid != 0: # 0 means empty in Tiled CSV
                            x = idx % width
                            y = idx // width
                            parsed["collision_mask"].add((x, y))
            
            # 2. Object Layer (Warps/Spawns)
            elif layer["type"] == "objectgroup":
                if layer["name"].lower() == "warps":
                    for obj in layer.get("objects", []):
                        x_start = int(obj["x"] // tiled_data["tilewidth"])
                        y_start = int(obj["y"] // tiled_data["tileheight"])
                        w_tiles = int(obj["width"] // tiled_data["tilewidth"])
                        h_tiles = int(obj["height"] // tiled_data["tileheight"])
                        
                        # Ensure at least 1x1
                        w_tiles = max(1, w_tiles)
                        h_tiles = max(1, h_tiles)

                        for dx in range(w_tiles):
                            for dy in range(h_tiles):
                                warp_data = {
                                    "x": x_start + dx,
                                    "y": y_start + dy,
                                    "target_zone": "town", # Default
                                    "target_x": 0,
                                    "target_y": 0
                                }
                                
                                # Parse custom properties for target
                                for prop in obj.get("properties", []):
                                    if prop["name"] == "target_zone":
                                        warp_data["target_zone"] = prop["value"]
                                    elif prop["name"] == "target_x":
                                        warp_data["target_x"] = prop["value"]
                                    elif prop["name"] == "target_y":
                                        warp_data["target_y"] = prop["value"]
                                
                                parsed["warps"].append(warp_data)
                                logger.info(f"Registered warp at ({warp_data['x']}, {warp_data['y']}) -> {warp_data['target_zone']}")
        
        # Summary Log
        logger.info(f"Map {tiled_data.get('width')}x{tiled_data.get('height')} parsed with {len(parsed['warps'])} warps.")
        return parsed

    def is_valid_move(self, zone_id, x, y):
        """
        Check if the move is valid using the collision mask
        """
        # If map unknown, fallback to valid (dev mode)
        if zone_id not in self.maps_data:
            return True
            
        map_info = self.maps_data[zone_id]
        
        # Bounds check
        if x < 0 or x >= map_info["width"] or y < 0 or y >= map_info["height"]:
            return False
            
        # Collision check
        if (x, y) in map_info["collision_mask"]:
            return False
            
        return True

    def process(self, state, event: GameEvent) -> list[GameEvent]:
        # 1. Run Base Logic (Random Encounters / Loot)
        events = super().process(state, event)
        
        
        # 2. Check Warps
        from pspf.events.movement import PlayerMoved, TeleportPlayer
        
        if isinstance(event, PlayerMoved):
            zone_id = event.zone_id
            x = event.x
            y = event.y
            
            if zone_id in self.maps_data:
                map_info = self.maps_data[zone_id]
                for warp in map_info["warps"]:
                    if warp["x"] == x and warp["y"] == y:
                        # Trigger Warp!
                        logger.info(f"Player {event.player_id} warped from {zone_id} to {warp['target_zone']}")
                        events.append(TeleportPlayer.create(
                            player_id=event.player_id,
                            zone_id=warp["target_zone"],
                            x=warp["target_x"],
                            y=warp["target_y"]
                        ))
                        break # Only one warp at a time
        
        return events
