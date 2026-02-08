
import json
import os

def check_tile(filename, x, y):
    with open(f"public/maps/{filename}", 'r') as f:
        data = json.load(f)
        
    width = data["width"]
    target_idx = y * width + x
    
    print(f"\nChecking {filename} at ({x}, {y}) [Index: {target_idx}]")
    
    # 1. Collision Layer
    collision_layer = None
    for layer in data["layers"]:
        if layer["name"] == "collision":
            collision_layer = layer
            break
            
    if collision_layer:
        tile_id = collision_layer["data"][target_idx]
        print(f"Collision Layer ID: {tile_id} (0 means empty/walkable)")
        if tile_id != 0:
            print("❌ BLOCKED by Collision Layer")
        else:
            print("✅ Walkable in Collision Layer")
    else:
        print("⚠️ No Collision Layer Found")

    # 2. Object Layer (Warps)
    print("Checking Warps/Objects at this location:")
    for layer in data["layers"]:
        if layer["type"] == "objectgroup":
            for obj in layer.get("objects", []):
                # Check for rectangle overlap
                ox = int(obj["x"] // data["tilewidth"])
                oy = int(obj["y"] // data["tileheight"])
                ow = int(obj["width"] // data["tilewidth"])
                oh = int(obj["height"] // data["tileheight"])
                
                # Default 1x1 if width/height 0 or missing
                ow = max(1, ow)
                oh = max(1, oh)
                
                if x >= ox and x < ox + ow and y >= oy and y < oy + oh:
                     print(f"  - Overlaps Object: {obj.get('name')} (Type: {layer.get('name')})")

def main():
    # Town Warp connects to Wild at (15, 28)
    check_tile("wild.tmj", 15, 28)
    
    # Wild Warp connects to Town at (15, 0)
    # Wait, previous analysis said town target was y=1 ?
    # Let's check where the warp sends them.
    # From generate_maps.py: 
    #   Town Warp -> Wild (15, 28)
    #   Wild Warp -> Town (15, 1)
    
    check_tile("town.tmj", 15, 1)
    check_tile("town.tmj", 15, 0) # Just in case

if __name__ == "__main__":
    main()
