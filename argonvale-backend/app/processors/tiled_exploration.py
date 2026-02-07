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
                if filename.endswith(".json"):
                    map_id = filename.replace(".json", "")
                    try:
                        with open(os.path.join(self.custom_maps_dir, filename), 'r') as f:
                            tiled_data = json.load(f)
                            self.maps_data[map_id] = self._parse_tiled_map(tiled_data)
                            logger.info(f"Loaded map: {map_id}")
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
                        x = int(obj["x"] // tiled_data["tilewidth"])
                        y = int(obj["y"] // tiled_data["tileheight"])
                        
                        warp_data = {
                            "x": x,
                            "y": y,
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

        return parsed

    def is_valid_move(self, zone_id, x, y):
        """
        Check if the move is valid using the collision mask
        """
        # If map unknown, fallback to valid (dev mode)
        if zone_id not in self.maps_data:
            # Try to lazy load? Or just return True
            return True
            
        map_info = self.maps_data[zone_id]
        
        # Bounds check
        if x < 0 or x >= map_info["width"] or y < 0 or y >= map_info["height"]:
            return False
            
        # Collision check
        if (x, y) in map_info["collision_mask"]:
            return False
            
        return True
