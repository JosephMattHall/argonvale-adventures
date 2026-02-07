import json
import os

MAPS_DIR = "."

def convert_map(filename):
    path = os.path.join(MAPS_DIR, filename)
    with open(path, 'r') as f:
        legacy = json.load(f)

    print(f"Converting {filename}...")

    # Basic Tiled Structure
    tiled = {
        "compressionlevel": -1,
        "height": legacy["height"],
        "infinite": False,
        "layers": [],
        "nextlayerid": 4,
        "nextobjectid": 1,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tiledversion": "1.10.2",
        "tileheight": legacy.get("tileSize", 48),
        "tilesets": [
            {
                "firstgid": 1,
                "image": "../../../src/assets/tilesets/world_tileset.png",
                "imageheight": 1024, # Dummy value, usually calculated
                "imagewidth": 1024,
                "margin": 0,
                "name": "world_tileset",
                "spacing": 0,
                "tilecount": 256, # Dummy
                "tileheight": legacy.get("tileSize", 48),
                "tilewidth": legacy.get("tileSize", 48)
            }
        ],
        "tilewidth": legacy.get("tileSize", 48),
        "type": "map",
        "version": "1.10",
        "width": legacy["width"]
    }

    # Convert Layers
    # 1. Ground
    tiled["layers"].append({
        "data": legacy["layers"]["ground"],
        "height": legacy["height"],
        "id": 1,
        "name": "ground",
        "opacity": 1,
        "type": "tilelayer",
        "visible": True,
        "width": legacy["width"],
        "x": 0,
        "y": 0
    })

    # 2. Objects
    tiled["layers"].append({
        "data": legacy["layers"]["objects"],
        "height": legacy["height"],
        "id": 2,
        "name": "objects",
        "opacity": 1,
        "type": "tilelayer",
        "visible": True,
        "width": legacy["width"],
        "x": 0,
        "y": 0
    })

    # 3. Collision
    tiled["layers"].append({
        "data": legacy["layers"]["collision"],
        "height": legacy["height"],
        "id": 3,
        "name": "collision",
        "opacity": 0.5, # Usually semi-transparent in editor
        "type": "tilelayer",
        "visible": True, # Visible for debugging, code handles logic
        "width": legacy["width"],
        "x": 0,
        "y": 0
    })
    
    # Save back
    with open(path, 'w') as f:
        json.dump(tiled, f, indent=4)
    
    print(f"Converted {filename} successfully.")

if __name__ == "__main__":
    convert_map("town.json")
    convert_map("wild.json")
