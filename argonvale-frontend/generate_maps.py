import json
import random

# Map Configuration
WIDTH_TOWN = 20
HEIGHT_TOWN = 20
WIDTH_WILD = 60
HEIGHT_WILD = 60
TILE_SIZE = 48

# Tile IDs (based on generated image rows - 0-indexed)
# Assuming 5 cols per row for simplicity in this mental model, 
# actual tileset layout might vary but we'll use assumed IDs 
# and update frontend to map check later.
# Actually, let's assume a grid of 8x8 tiles in the image for simpler math if needed.
# But for now, let's use arbitrary IDs and I'll build a mapping in the frontend.

# IDs:
EMPTY = 0
GRASS = 1
WATER = 6
PATH_DIRT = 11
WALL_WOOD = 16
TREE_OAK = 21
ROCK = 22

def create_town_map():
    # 1. Ground Layer (Grass everywhere)
    ground = [GRASS] * (WIDTH_TOWN * HEIGHT_TOWN)
    
    # Add some paths (Cross shape)
    for y in range(HEIGHT_TOWN):
        ground[y * WIDTH_TOWN + 10] = PATH_DIRT # Vertical path
    for x in range(WIDTH_TOWN):
        ground[10 * WIDTH_TOWN + x] = PATH_DIRT # Horizontal path

    # 2. Objects Layer (Houses and Trees)
    objects = [0] * (WIDTH_TOWN * HEIGHT_TOWN)
    collision = [0] * (WIDTH_TOWN * HEIGHT_TOWN)

    # Add 4 houses in corners
    house_locs = [(5,5), (15,5), (5,15), (15,15)]
    for hx, hy in house_locs:
        # A simple 2x2 'house' made of walls
        for y in range(hy, hy+2):
            for x in range(hx, hx+2):
                idx = y * WIDTH_TOWN + x
                objects[idx] = WALL_WOOD
                collision[idx] = 1 # Solid

    # Add random trees
    for _ in range(20):
        tx, ty = random.randint(0, 19), random.randint(0, 19)
        idx = ty * WIDTH_TOWN + tx
        if objects[idx] == 0 and ground[idx] != PATH_DIRT:
            objects[idx] = TREE_OAK
            collision[idx] = 1

    return {
        "width": WIDTH_TOWN,
        "height": HEIGHT_TOWN,
        "tileSize": TILE_SIZE,
        "tileset": "/src/assets/tilesets/world_tileset.png",
        "layers": {
            "ground": ground,
            "objects": objects,
            "collision": collision
        }
    }

def create_wild_map():
    ground = [GRASS] * (WIDTH_WILD * HEIGHT_WILD)
    objects = [0] * (WIDTH_WILD * HEIGHT_WILD)
    collision = [0] * (WIDTH_WILD * HEIGHT_WILD)

    # Random Water patches
    for _ in range(5):
        wx, wy = random.randint(5, 55), random.randint(5, 55)
        for y in range(wy, wy+5):
            for x in range(wx, wx+5):
                if 0 <= x < WIDTH_WILD and 0 <= y < HEIGHT_WILD:
                    idx = y * WIDTH_WILD + x
                    ground[idx] = WATER
                    collision[idx] = 1 # Water is solid for walking

    # Lots of random trees/rocks
    for _ in range(300):
        tx, ty = random.randint(0, WIDTH_WILD-1), random.randint(0, HEIGHT_WILD-1)
        idx = ty * WIDTH_WILD + tx
        if collision[idx] == 0:
            item = random.choice([TREE_OAK, ROCK])
            objects[idx] = item
            collision[idx] = 1

    return {
        "width": WIDTH_WILD,
        "height": HEIGHT_WILD,
        "tileSize": TILE_SIZE,
        "tileset": "/src/assets/tilesets/world_tileset.png",
        "layers": {
            "ground": ground,
            "objects": objects,
            "collision": collision
        }
    }

if __name__ == "__main__":
    town = create_town_map()
    with open("public/maps/town.json", "w") as f:
        json.dump(town, f)
    
    wild = create_wild_map()
    with open("public/maps/wild.json", "w") as f:
        json.dump(wild, f)
