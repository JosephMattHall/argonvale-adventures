from pspf.events.base import GameEvent
from typing import Literal, List, Dict, Any, Optional
from app.schemas.items import WeaponStats

class CombatStarted(GameEvent):
    combat_id: str
    attacker_id: int
    attacker_companion_id: int
    defender_id: Optional[int] = None # None for AI
    defender_companion_id: Optional[int] = None
    mode: Literal["pve", "pvp"] = "pve"
    context: Dict[str, Any] = {} # stats, names, etc

class CombatAction(GameEvent):
    combat_id: str
    actor_id: int # Player ID or 'ai'
    action_type: str # 'attack', 'use_item'
    stance: str = "normal" # normal, berserk, defensive
    item_ids: List[int] = [] # Up to 2
    item_id: Optional[int] = None # For legacy single use_item if needed

class TurnProcessed(GameEvent):
    combat_id: str
    turn_number: int
    actor_id: int
    damage_dealt: int
    description: str
    attacker_hp: int
    defender_hp: int # In PvE, this is the monster
    
    # Metadata for broadcasting
    attacker_id: int
    defender_id: Optional[int] = None
    mode: Literal["pve", "pvp"] = "pve"
    
    # Status Indicators
    player_frozen_until: int = 0
    enemy_frozen_until: int = 0
    player_stealth_until: int = 0
    enemy_stealth_until: int = 0
    used_item_ids: List[int] = []

class CombatEnded(GameEvent):
    combat_id: str
    winner_id: int
    attacker_id: int
    attacker_companion_id: int
    defender_id: Optional[int] = None
    defender_companion_id: Optional[int] = None
    mode: Literal["pve", "pvp"] = "pve"
    loot: Optional[Dict[str, Any]] = None
    dropped_item: Optional[Dict[str, Any]] = None # Item template data
    xp_gained: int = 0

class JoinPvPQueue(GameEvent):
    player_id: int
    companion_id: int

class LeavePvPQueue(GameEvent):
    """Player leaves the PvP matchmaking queue."""
    pass

class ResumeCombat(GameEvent):
    companion_id: int

class ForfeitCombat(GameEvent):
    combat_id: str
    player_id: int
