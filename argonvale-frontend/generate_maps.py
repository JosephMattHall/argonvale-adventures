import json
import os

MAP_WIDTH = 30
MAP_HEIGHT = 30
TILE_SIZE = 48

# Tile IDs
GRASS_ID = 1
WALL_ID = 21 # Basic block for gate visual

def create_layer(name, data, visible=True, opacity=1.0):
    return {
        "data": data,
        "height": MAP_HEIGHT,
        "width": MAP_WIDTH,
        "id": hash(name) % 1000,
        "name": name,
        "opacity": opacity,
        "type": "tilelayer",
        "visible": visible,
        "x": 0,
        "y": 0
    }

def generate_map(filename, warp_location, target_map_data):
    # 1. Initialize Layers
    ground_data = [GRASS_ID] * (MAP_WIDTH * MAP_HEIGHT)
    objects_data = [0] * (MAP_WIDTH * MAP_HEIGHT)
    collision_data = [0] * (MAP_WIDTH * MAP_HEIGHT)
    
    # 2. Warp Visuals & Objects
    warps_objects = []
    
    if warp_location == "top":
        # Draw Gate at Top Center
        gate_x = MAP_WIDTH // 2
        gate_y = 0
        
        # Warp Object
        warps_objects.append({
            "height": 48,
            "id": 1,
            "name": "gate_exit",
            "rotation": 0,
            "type": "",
            "visible": True,
            "width": 48 * 2,
            "x": (gate_x - 1) * 48, # Centered-ish
            "y": 0,
            "properties": [
                {"name": "target_zone", "type": "string", "value": target_map_data["zone"]},
                {"name": "target_x", "type": "int", "value": target_map_data["x"]},
                {"name": "target_y", "type": "int", "value": target_map_data["y"]}
            ]
        })
        
        # Visuals
        idx = gate_y * MAP_WIDTH + (gate_x - 1)
        objects_data[idx] = WALL_ID
        objects_data[idx+1] = WALL_ID
        
    elif warp_location == "bottom":
        # Draw Gate at Bottom Center
        gate_x = MAP_WIDTH // 2
        gate_y = MAP_HEIGHT - 1
        
        # Warp Object
        warps_objects.append({
            "height": 48,
            "id": 1,
            "name": "gate_exit",
            "rotation": 0,
            "type": "",
            "visible": True,
            "width": 48 * 2,
            "x": (gate_x - 1) * 48,
            "y": gate_y * 48,
            "properties": [
                {"name": "target_zone", "type": "string", "value": target_map_data["zone"]},
                {"name": "target_x", "type": "int", "value": target_map_data["x"]},
                {"name": "target_y", "type": "int", "value": target_map_data["y"]}
            ]
        })

        # Visuals
        idx = gate_y * MAP_WIDTH + (gate_x - 1)
        objects_data[idx] = WALL_ID
        objects_data[idx+1] = WALL_ID

    # 3. Assemble Map
    tiled_map = {
        "compressionlevel": -1,
        "height": MAP_HEIGHT,
        "width": MAP_WIDTH,
        "infinite": False,
        "layers": [
            create_layer("ground", ground_data),
            create_layer("objects", objects_data),
            create_layer("collision", collision_data, visible=True, opacity=0.5),
            {
                "draworder": "topdown",
                "id": 5,
                "name": "warps",
                "objects": warps_objects,
                "opacity": 1,
                "type": "objectgroup",
                "visible": True,
                "x": 0,
                "y": 0
            }
        ],
        "nextlayerid": 6,
        "nextobjectid": 2,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tiledversion": "1.11.2",
        "tileheight": TILE_SIZE,
        "tilewidth": TILE_SIZE,
        "type": "map",
        "version": "1.10",
        "tilesets": [
            {
                "columns": 21,
                "firstgid": 1,
                "image": "../tilesets/world_tileset.png",
                "imageheight": 1024,
                "imagewidth": 1024,
                "margin": 0,
                "name": "world_tileset",
                "spacing": 0,
                "tilecount": 441,
                "tileheight": 48,
                "tilewidth": 48
            }
        ]
    }
    
    # Write File
    output_path = f"public/maps/{filename}"
    with open(output_path, "w") as f:
        json.dump(tiled_map, f, indent=4)
    
    print(f"Generated {output_path}")

def main():
    # Generate Town (Warp at TOP -> Wild Bottom)
    # Target: Wild (15, 28) - one tile up from bottom edge
    generate_map("town.tmj", "top", {"zone": "wild", "x": 15, "y": 28})
    
    # Generate Wild (Warp at BOTTOM -> Town Top)
    # Target: Town (15, 1) - one tile down from top edge
    generate_map("wild.tmj", "bottom", {"zone": "town", "x": 15, "y": 1})

if __name__ == "__main__":
    main()
