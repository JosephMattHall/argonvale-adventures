import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from pspf.events.base import GameEvent
    from pspf.state.base import GameState
    from pspf.streams.registry import registry
    from pspf.processors.combat import CombatProcessor
    
    print("PSPF Imports Successful")
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)
