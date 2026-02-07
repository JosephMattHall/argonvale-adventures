import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from app.processors.tiled_exploration import TiledExplorationProcessor

def test_tiled_loading():
    print("Initializing TiledExplorationProcessor...")
    # Point to the actual maps directory (assuming running from argonvale-backend)
    processor = TiledExplorationProcessor(maps_dir="../argonvale-frontend/public/maps")
    
    # Check if maps loaded
    if "town" not in processor.maps_data:
        print("FAIL: 'town' map not loaded.")
        return
    if "wild" not in processor.maps_data:
        print("FAIL: 'wild' map not loaded.")
        return
        
    print("SUCCESS: Maps loaded.")
    
    # Check dimensions
    town = processor.maps_data["town"]
    print(f"Town Dimensions: {town['width']}x{town['height']}")
    
    # Check Collision Logic
    # In town.json (converted), we know there are collision tiles.
    # Let's check a known collision spot if possible, or just generic bounds check.
    
    # Test Bounds
    if processor.is_valid_move("town", -1, 0):
        print("FAIL: Out of bounds move (-1, 0) accepted.")
    elif processor.is_valid_move("town", 0, -1):
        print("FAIL: Out of bounds move (0, -1) accepted.")
    elif processor.is_valid_move("town", 999, 999):
         print("FAIL: Out of bounds move (999, 999) accepted.")
    else:
        print("SUCCESS: Bounds checks passed.")
        
    # Test valid move (assuming 0,0 is not solid, though in town it might be wall? Let's assume middle is safe)
    # Town center is usually safe.
    safe_x = town['width'] // 2
    safe_y = town['height'] // 2
    if processor.is_valid_move("town", safe_x, safe_y):
        print(f"SUCCESS: Center move ({safe_x}, {safe_y}) is valid.")
    else:
        print(f"WARNING: Center move ({safe_x}, {safe_y}) is invalid (Could be solid?).")

    # Check collision layer parsing
    if not town["collision_mask"]:
         print("WARNING: No collision tiles found in town map.")
    else:
         print(f"SUCCESS: Found {len(town['collision_mask'])} collision tiles.")

if __name__ == "__main__":
    test_tiled_loading()
