import json
import os

MAP_WIDTH = 30
MAP_HEIGHT = 30
TILE_SIZE = 48

# Approximate Tile IDs (from world_tileset.png assumption)
# Since I can't see, I'll use placeholders.
# ID 1 = Grass (from town.json)
# ID 21 = Wall/Building (from town.json collision usage)
# ID 16 = Floor/Path (from town.json collision mask holes)

GRASS_ID = 1
WALL_ID = 21 
FLOOR_ID = 16 

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

def generate_town():
    # 1. Initialize Layers
    ground_data = [GRASS_ID] * (MAP_WIDTH * MAP_HEIGHT)
    objects_data = [0] * (MAP_WIDTH * MAP_HEIGHT)
    collision_data = [0] * (MAP_WIDTH * MAP_HEIGHT)
    
    # 2. Helper to set tile
    def set_tile(layer_data, x, y, tile_id):
        if 0 <= x < MAP_WIDTH and 0 <= y < MAP_HEIGHT:
            layer_data[y * MAP_WIDTH + x] = tile_id
            
    def fill_rect(layer_data, x, y, w, h, tile_id):
        for dy in range(h):
            for dx in range(w):
                set_tile(layer_data, x + dx, y + dy, tile_id)

    # 3. Draw Features
    
    # -- Central Courtyard (Circle-ish) --
    cx, cy = 15, 15
    for y in range(cy - 4, cy + 5):
        for x in range(cx - 4, cx + 5):
            if (x - cx)**2 + (y - cy)**2 <= 16:
                set_tile(ground_data, x, y, FLOOR_ID) # Plaza floor

    # -- Paths --
    # North Path
    fill_rect(ground_data, 13, 0, 4, 11, FLOOR_ID)
    # South Path
    fill_rect(ground_data, 13, 19, 4, 11, FLOOR_ID)
    # West Path
    fill_rect(ground_data, 0, 13, 11, 4, FLOOR_ID)
    # East Path
    fill_rect(ground_data, 19, 13, 11, 4, FLOOR_ID)

    # -- Building: Weapon Shop (NW) --
    bx, by = 4, 4
    bw, bh = 6, 5
    fill_rect(objects_data, bx, by, bw, bh, WALL_ID)
    fill_rect(collision_data, bx, by, bw, bh, 1) # Solid
    # Door
    set_tile(objects_data, bx + 2, by + bh - 1, 0) # Open door
    set_tile(collision_data, bx + 2, by + bh - 1, 0) # Walkable
    set_tile(ground_data, bx + 2, by + bh, FLOOR_ID) # Path to door

    # -- Building: Armor Shop (NE) --
    bx, by = 20, 4
    bw, bh = 6, 5
    fill_rect(objects_data, bx, by, bw, bh, WALL_ID)
    fill_rect(collision_data, bx, by, bw, bh, 1)
    # Door
    set_tile(objects_data, bx + 2, by + bh - 1, 0)
    set_tile(collision_data, bx + 2, by + bh - 1, 0)
    set_tile(ground_data, bx + 2, by + bh, FLOOR_ID)

    # -- Building: Potion Shop (SW) --
    bx, by = 4, 21
    bw, bh = 6, 5
    fill_rect(objects_data, bx, by, bw, bh, WALL_ID)
    fill_rect(collision_data, bx, by, bw, bh, 1)
    # Door
    set_tile(objects_data, bx + 2, by, 0) # Door logic mismatch? Assuming south facing implies door at bottom usually, but let's put it top for bottom buildings facing plaza? No, standard is South facing.
    # Actually, bottom buildings facings North?
    # Let's put door on Top for SW/SE buildings so they face the plaza
    set_tile(objects_data, bx + 2, by, 0) 
    set_tile(collision_data, bx + 2, by, 0)
    set_tile(ground_data, bx + 2, by - 1, FLOOR_ID)

    # -- Building: Food Shop (SE) --
    bx, by = 20, 21
    bw, bh = 6, 5
    fill_rect(objects_data, bx, by, bw, bh, WALL_ID)
    fill_rect(collision_data, bx, by, bw, bh, 1)
    # Door (Top)
    set_tile(objects_data, bx + 2, by, 0)
    set_tile(collision_data, bx + 2, by, 0)
    set_tile(ground_data, bx + 2, by - 1, FLOOR_ID)
    
    # 4. Assemble Map
    tiled_map = {
        "compressionlevel": -1,
        "height": MAP_HEIGHT,
        "width": MAP_WIDTH,
        "infinite": False,
        "layers": [
            create_layer("ground", ground_data),
            create_layer("objects", objects_data),
            create_layer("collision", collision_data, visible=True, opacity=0.5)
        ],
        "nextlayerid": 4,
        "nextobjectid": 1,
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
    
    # Warps Layer (Object Group)
    warps_layer = {
        "draworder": "topdown",
        "id": 5,
        "name": "warps",
        "objects": [
            # Weapon Shop Warp
            {
                "height": 48,
                "id": 1,
                "name": "weapon_shop",
                "rotation": 0,
                "type": "",
                "visible": True,
                "width": 48,
                "x": (4 + 2) * 48,
                "y": (4 + 4) * 48, # Door is at y=8
                "properties": [
                    {"name": "target_zone", "type": "string", "value": "weapon_shop_interior"},
                    {"name": "target_x", "type": "int", "value": 5},
                    {"name": "target_y", "type": "int", "value": 8}
                ]
            },
            # North Gate Warp (To Wild)
            {
                "height": 48,
                "id": 2,
                "name": "north_gate",
                "rotation": 0,
                "type": "",
                "visible": True,
                "width": 48 * 2, # 2 Tiles wide
                "x": 14 * 48,
                "y": 0, # Top edge
                "properties": [
                    {"name": "target_zone", "type": "string", "value": "wild"},
                    {"name": "target_x", "type": "int", "value": 15},
                    {"name": "target_y", "type": "int", "value": 29} # Bottom of wild map
                ]
            }
        ],
        "opacity": 1,
        "type": "objectgroup",
        "visible": True,
        "x": 0,
        "y": 0
    }
    tiled_map["layers"].append(warps_layer)

    # Write File
    output_path = "public/maps/town_v2.json"
    with open(output_path, "w") as f:
        json.dump(tiled_map, f, indent=4)
    
    print(f"Generated {output_path}")

if __name__ == "__main__":
    generate_town()
