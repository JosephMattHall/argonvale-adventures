import random
from pspf.processors.base import BaseProcessor
from pspf.events.base import GameEvent
from pspf.events.combat import CombatStarted, CombatAction, TurnProcessed, CombatEnded
from pspf.state.base import GameState

# Simple in-memory state for this MVP. 
# In production, this would be reconstructed from event stream or a Snapshot store.
class CombatSession:
    def __init__(self, event: CombatStarted):
        self.combat_id = event.combat_id
        self.attacker_id = event.attacker_id
        self.defender_id = event.defender_id  # For PvP
        self.mode = event.mode
        
        # Player Stats
        self.companion_id = event.context.get("companion_id")
        self.player_hp = event.context.get("player_hp", 100)
        self.player_max_hp = event.context.get("player_max_hp", 100)
        self.player_stats = event.context.get("player_stats", {"str": 10, "def": 5})

        # Enemy Stats
        self.enemy_name = event.context.get("enemy_name", "Unknown")
        self.enemy_hp = event.context.get("enemy_hp", 50)
        self.enemy_max_hp = event.context.get("enemy_max_hp", 50)
        self.enemy_stats = event.context.get("enemy_stats", {"STR": 5, "DEF": 2})
        self.enemy_weapons = event.context.get("enemy_weapons", [])
        self.enemy_items = event.context.get("enemy_items", [])
        self.equipped_items = event.context.get("equipped_items", [])

        self.turn = 1
        
        # Status Effects (Turn number until which the effect lasts)
        self.player_frozen_until = 0
        self.enemy_frozen_until = 0
        self.player_stealth_until = 0
        self.enemy_stealth_until = 0
        
        # Tracking for used consumables (one-time use per battle)
        self.used_item_ids = set()
        
        # PvP: Real-time synchronization state
        self.pending_actions = {}  # {player_id: CombatAction} - collect actions from both players
        self.current_turn_player = event.attacker_id if event.mode == "pvp" else None  # Whose turn it is
        self.turn_start_time = None  # Timestamp when turn started (for timeout)
        self.is_locked = False  # Prevent concurrent action processing

class CombatProcessor(BaseProcessor):
    def __init__(self):
        super().__init__()
        self.sessions = {} # combat_id -> CombatSession

    def calculate_damage(self, base_atk: int, defender_def: int, stance_atk_mod: float, stance_def_mod: float, is_player: bool, defender_stealth: bool) -> tuple[int, bool]:
        """
        New balanced formula: Damage = BaseAtk * (20 / (20 + Def)) * StanceMod * Variance
        """
        if defender_stealth:
            return 0, False

        # 1. Critical Hit (5% chance)
        is_crit = random.random() < 0.05
        crit_mult = 1.5 if is_crit else 1.0

        # 2. Variance (0.9 to 1.1)
        variance = random.uniform(0.9, 1.1)

        # 3. Defense Mitigation
        mitigation = 20 / (20 + (defender_def * stance_def_mod))
        
        raw_dmg = base_atk * mitigation * stance_atk_mod * variance * crit_mult
        
        return max(1, int(raw_dmg)), is_crit

    def process(self, state: any, event: GameEvent) -> list[GameEvent]:
        events = []

        if isinstance(event, CombatStarted):
            session = CombatSession(event)
            self.sessions[session.combat_id] = session
        
        elif isinstance(event, CombatAction):
            session = self.sessions.get(event.combat_id)
            if not session: return []
            
            # **PvP MODE: Collect actions from both players before processing**
            if session.mode == "pvp":
                actor_id = event.actor_id
                
                # Prevent concurrent processing
                if session.is_locked:
                    return []
                
               # Store this player's action
                session.pending_actions[actor_id] = event
                
                # Check if we have both players' actions
                player_ids = {session.attacker_id, session.defender_id}
                if set(session.pending_actions.keys()) == player_ids:
                    # Both submitted! Process the turn
                    session.is_locked = True
                    events = self._process_pvp_turn(session)
                    session.pending_actions = {}
                    session.is_locked = False
                    return events
                else:
                    # Waiting for other player
                    return []
            
            # **PvE MODE: Continue with existing single-player logic**

            # 1. Player Turn
            damage_dealt = 0
            log = ""
            ai_turn_skipped = False
            player_turn_skipped = False

            # Check if Player is Frozen
            if session.turn <= session.player_frozen_until:
                log = "You are frozen and cannot move!"
                player_turn_skipped = True
            else:
                # --- Unified Action Logic ---
                # A player can select up to 2 items (weapons or consumables)
                selected_ids = getattr(event, 'item_ids', [])
                if not selected_ids and getattr(event, 'weapon_ids', None):
                    selected_ids = event.weapon_ids
                if not selected_ids and getattr(event, 'item_id', None):
                    selected_ids = [event.item_id]

                item_logs = []
                atk_icons = 0
                def_icons = 0
                
                # 1. Process selected items for immediate effects (Consumables)
                for item_id in selected_ids:
                    item = next((i for i in session.equipped_items if i.get("id") == item_id), None)
                    if not item: continue
                    
                    # Weapons/Shields/Armor are NOT consumables here
                    if item.get("item_type") in ["weapon", "shield", "armor"]:
                        continue

                    # Consumable Logic
                    if item_id in session.used_item_ids:
                        item_logs.append(f"{item.get('name')} is already spent!")
                        continue

                    stats = item.get("stats", {})
                    effect = item.get("effect", {})
                    
                    # Healing
                    restore_amt = stats.get("heal") or 0
                    if "heal_pct" in stats:
                        restore_amt = int(session.player_max_hp * (stats["heal_pct"] / 100))
                    
                    if restore_amt > 0:
                        session.player_hp = min(session.player_hp + restore_amt, session.player_max_hp)
                        item_logs.append(f"Used {item.get('name')} to restore {restore_amt} HP.")

                    # Freeze
                    if effect.get("type") == "freeze":
                        duration = effect.get("duration", 1)
                        session.enemy_frozen_until = session.turn + duration
                        item_logs.append(f"Used {item.get('name')} and FROZE the opponent!")

                    # Stealth
                    if effect.get("type") == "stealth":
                        duration = effect.get("duration", 1)
                        session.player_stealth_until = session.turn + duration
                        item_logs.append(f"Used {item.get('name')} and became INVISIBLE!")

                    # Mark as used (consumables only)
                    session.used_item_ids.add(item_id)

                # 2. Calculate Damage/Defense from Gear
                base_str = session.player_stats.get("str", 10)
                base_def = session.player_stats.get("def", 5)
                freeze_chance_total = 0

                for item in session.equipped_items:
                    # Passives (Armor/Shield) are always on, Weapons must be selected
                    is_weapon = item.get("item_type") == "weapon"
                    is_passive = item.get("item_type") in ["armor", "shield"]
                    
                    if (is_weapon and item.get("id") in selected_ids) or is_passive:
                        stats = item.get("stats", {})
                        a_val = stats.get("atk", {}) or stats.get("attack", {})
                        d_val = stats.get("def", {}) or stats.get("defense", {})
                        
                        if isinstance(a_val, dict): atk_icons += sum(a_val.values())
                        elif isinstance(a_val, (int, float)): atk_icons += a_val
                        
                        if isinstance(d_val, dict): def_icons += sum(d_val.values())
                        elif isinstance(d_val, (int, float)): def_icons += d_val
                        
                        # Weapon-based Freeze (only if NOT already used/triggered)
                        eff = item.get("effect", {})
                        if eff.get("type") == "freeze" and item.get("id") not in session.used_item_ids:
                            freeze_chance_total = max(freeze_chance_total, eff.get("chance", 0))

                total_atk = base_str + atk_icons
                current_player_def = base_def + def_icons

                # 3. Apply Stance Modifiers
                stance_atk_mod = 1.0
                stance_def_mod = 1.0
                if event.stance == "berserk":
                    stance_atk_mod, stance_def_mod = 1.2, 0.8
                elif event.stance == "defensive":
                    stance_atk_mod, stance_def_mod = 0.8, 1.2

                # 4. Final Damage Calculation
                enemy_def = session.enemy_stats.get("DEF", 5)
                ai_def_icons = 0
                for i in session.enemy_items:
                    if i.get("item_type") in ["armor", "shield"]:
                        d_v = i.get("stats", {}).get("def", {}) or i.get("stats", {}).get("defense", {})
                        if isinstance(d_v, dict): ai_def_icons += sum(d_v.values())
                        elif isinstance(d_v, (int, float)): ai_def_icons += d_v
                
                total_enemy_def = enemy_def + ai_def_icons
                enemy_stealth = session.turn <= session.enemy_stealth_until
                
                damage_dealt, crit = self.calculate_damage(total_atk, total_enemy_def, stance_atk_mod, 1.0, True, enemy_stealth)
                session.enemy_hp -= damage_dealt
                
                # 5. Composite Log
                crit_text = "CRITICAL HIT! " if crit else ""
                if enemy_stealth:
                    atk_log = "You attack, but the enemy is invisible!"
                else:
                    atk_log = f"{crit_text}Using {event.stance} stance, you deal {damage_dealt} damage!"
                    if freeze_chance_total > 0 and random.random() <= freeze_chance_total:
                        session.enemy_frozen_until = session.turn + 1
                        atk_log += " The blow FROZE your opponent!"

                log = " ".join(item_logs) + (" " if item_logs else "") + atk_log
                
                session.current_player_def = current_player_def
                session.current_stance_def_mod = stance_def_mod

            events.append(TurnProcessed.create(
                combat_id=session.combat_id,
                turn_number=session.turn,
                actor_id=event.actor_id,
                damage_dealt=damage_dealt,
                description=log,
                attacker_hp=session.player_hp,
                defender_hp=session.enemy_hp,
                player_frozen_until=session.player_frozen_until,
                enemy_frozen_until=session.enemy_frozen_until,
                player_stealth_until=session.player_stealth_until,
                enemy_stealth_until=session.enemy_stealth_until,
                used_item_ids=list(session.used_item_ids)
            ))

            if session.enemy_hp <= 0:
                xp_gain = (session.enemy_stats.get("STR", 5) * 2) + 10
                dropped = None
                if random.random() < 0.25 and session.enemy_items:
                    dropped = random.choice(session.enemy_items)
                
                events.append(CombatEnded.create(
                    combat_id=session.combat_id,
                    winner_id=event.actor_id,
                    mode=session.mode,
                    loot={"coins": random.randint(15, 30)},
                    dropped_item=dropped,
                    xp_gained=xp_gain
                ))
                del self.sessions[session.combat_id]
                return events

            # 2. AI Turn
            ai_final_dmg = 0
            ai_action_log = ""
            
            # Check if AI is Frozen
            if session.turn <= session.enemy_frozen_until:
                ai_action_log = f"{session.enemy_name} is frozen and skips its turn!"
                ai_turn_skipped = True
            else:
                ai_str = session.enemy_stats.get("STR", 5)
                player_def = getattr(session, 'current_player_def', session.player_stats.get("def", 5))
                stance_def_mod = getattr(session, 'current_stance_def_mod', 1.0)
                
                hp_percent = (session.enemy_hp / session.enemy_max_hp) * 100
                rand = random.random()
                
                # Player Stealth check
                player_stealth = session.turn <= session.player_stealth_until

                # --- AI ACTION SELECTION ---
                if rand < 0.15: # Support/Consumable
                    heal_item = next((i for i in session.enemy_items if i.get("type") == "heal"), None)
                    if hp_percent < 40 and heal_item:
                        restore = heal_item.get("value", 20)
                        session.enemy_hp = min(session.enemy_hp + restore, session.enemy_max_hp)
                        ai_action_log = f"{session.enemy_name} used {heal_item.get('name')} and restored {restore} HP!"
                        session.enemy_items.remove(heal_item)
                    else:
                        # NEW: AI uses Stealth or Freeze items if they have them
                        stealth_item = next((i for i in session.enemy_items if i.get("type") == "stealth" or i.get("effect", {}).get("type") == "stealth"), None)
                        if stealth_item:
                            session.enemy_stealth_until = session.turn + 1
                            ai_action_log = f"{session.enemy_name} used {stealth_item.get('name')} and vanished from sight!"
                            session.enemy_items.remove(stealth_item)
                        else:
                            rand = 0.5 
                
                if ai_action_log == "":
                    ai_stances = ["normal", "berserk", "defensive"]
                    ai_stance = random.choice(ai_stances)
                    
                    ai_atk_mod, ai_def_mod = 1.0, 1.0
                    if ai_stance == "berserk": ai_atk_mod, ai_def_mod = 1.2, 0.8
                    elif ai_stance == "defensive": ai_atk_mod, ai_def_mod = 0.8, 1.2

                    ai_atk_icons, ai_def_icons = 0, 0
                    weapon_pool, defensive_pool = [], []
                    
                    all_gear = session.enemy_weapons + session.enemy_items
                    for item in all_gear:
                        stats = item.get("stats", {})
                        if not stats: continue
                        atk_val = sum(stats.get("atk", {}).values())
                        def_val = sum(stats.get("def", {}).values())
                        if atk_val > 0: weapon_pool.append({"item": item, "atk": atk_val, "def": def_val})
                        if def_val > 0: defensive_pool.append({"item": item, "atk": atk_val, "def": def_val})

                    if rand < 0.40:
                        ai_stance = "defensive"
                        ai_atk_mod, ai_def_mod = 0.8, 1.2
                        defensive_pool.sort(key=lambda x: x["def"], reverse=True)
                        selected = defensive_pool[:2]
                        for s in selected:
                            ai_def_icons += s["def"]
                            ai_atk_icons += s["atk"]
                        
                        total_ai_atk = ai_str + ai_atk_icons
                        ai_final_dmg, ai_crit = self.calculate_damage(total_ai_atk, player_def, ai_atk_mod, stance_def_mod, False, player_stealth)
                        session.player_hp -= ai_final_dmg
                        names = [s["item"].get("name") for s in selected]
                        using_text = f" with its {', '.join(names)}" if names else ""
                        ai_action_log = f"{session.enemy_name} takes a defensive stance{using_text}, dealing {ai_final_dmg} damage!"
                    else:
                        weapon_pool.sort(key=lambda x: x["atk"], reverse=True)
                        selected = weapon_pool[:2]
                        for s in selected:
                            ai_atk_icons += s["atk"]
                            ai_def_icons += s["def"]
                        
                        total_ai_atk = ai_str + ai_atk_icons
                        ai_final_dmg, ai_crit = self.calculate_damage(total_ai_atk, player_def, ai_atk_mod, stance_def_mod, False, player_stealth)
                        session.player_hp -= ai_final_dmg
                        crit_text = "CRITICAL! " if ai_crit else ""
                        stance_text = f" in {ai_stance} stance" if ai_stance != "normal" else ""
                        wp_names = [s["item"].get("name") for s in selected]
                        using_text = f" using {', '.join(wp_names)}" if wp_names else ""
                        ai_action_log = f"{crit_text}{session.enemy_name} attacks{stance_text}{using_text} for {ai_final_dmg} damage!"
                    
                    if player_stealth:
                        ai_action_log = f"{session.enemy_name} tried to attack, but you are invisible and took 0 damage!"

            events.append(TurnProcessed.create(
                combat_id=session.combat_id,
                turn_number=session.turn,
                actor_id=0,
                damage_dealt=ai_final_dmg,
                description=ai_action_log,
                attacker_hp=session.player_hp,
                defender_hp=session.enemy_hp,
                player_frozen_until=session.player_frozen_until,
                enemy_frozen_until=session.enemy_frozen_until,
                player_stealth_until=session.player_stealth_until,
                enemy_stealth_until=session.enemy_stealth_until
            ))

            if session.player_hp <= 0:
                 session.player_hp = 0
                 events.append(CombatEnded.create(
                    combat_id=session.combat_id,
                    winner_id=0,
                    mode=session.mode,
                    xp_gained=0
                ))
                 del self.sessions[session.combat_id]
            else:
                session.turn += 1

        return events

    def _process_pvp_turn(self, session: 'CombatSession') -> list[GameEvent]:
        """Process a PvP turn where both players have submitted their actions"""
        events = []
        
        # Get both actions
        p1_action = session.pending_actions.get(session.attacker_id)
        p2_action = session.pending_actions.get(session.defender_id)
        
        if not p1_action or not p2_action:
            return []
        
        # Process both actions simultaneously (MVP approach)
        # TODO: Speed-based turn order in future iterations
        
        # Calculate results for both players
        p1_damage, p1_log, p1_used_items = self._calculate_action_result(session, p1_action, True)
        p2_damage, p2_log, p2_used_items = self._calculate_action_result(session, p2_action, False)
        
        # Apply damage
        session.enemy_hp -= p1_damage
        session.player_hp -= p2_damage
        
        # Combined log
        combined_log = f"{p1_log} | {p2_log}"
        
        # Create turn event
        turn_event = TurnProcessed.create(
            combat_id=session.combat_id,
            turn_number=session.turn,
            actor_id=session.attacker_id,
            damage_dealt=p1_damage,
            description=combined_log,
            attacker_hp=session.player_hp,
            defender_hp=session.enemy_hp,
            player_frozen_until=session.player_frozen_until,
            enemy_frozen_until=session.enemy_frozen_until,
            player_stealth_until=session.player_stealth_until,
            enemy_stealth_until=session.enemy_stealth_until,
            used_item_ids=list(p1_used_items | p2_used_items)
        )
        
        events.append(turn_event)
        session.turn += 1
        
        # Check win conditions
        if session.player_hp <= 0:
            end_event = CombatEnded.create(
                combat_id=session.combat_id,
                winner_id=session.defender_id,
                mode="pvp",
                xp_gained=0
            )
            events.append(end_event)
            del self.sessions[session.combat_id]
        elif session.enemy_hp <= 0:
            end_event = CombatEnded.create(
                combat_id=session.combat_id,
                winner_id=session.attacker_id,
                mode="pvp",
                xp_gained=0
            )
            events.append(end_event)
            del self.sessions[session.combat_id]
        
        return events
    
    def _calculate_action_result(self, session: 'CombatSession', action: 'CombatAction', is_attacker: bool) -> tuple:
        """Calculate damage from a player's action. Returns (damage, log, used_items_set)"""
        damage = 0
        logs = []
        used_items = set()
        
        # Get stats
        if is_attacker:
            atk = session.player_stats.get("str", 10)
            def_val = session.enemy_stats.get("def", 5)
            frozen = session.turn <= session.player_frozen_until
            opp_stealth = session.turn <= session.enemy_stealth_until
        else:
            atk = session.enemy_stats.get("str", 10)
            def_val = session.player_stats.get("def", 5)
            frozen = session.turn <= session.enemy_frozen_until
            opp_stealth = session.turn <= session.player_stealth_until
        
        if frozen:
            return 0, "Frozen!", used_items
        
        # Simple damage calc (MVP - items processing can be added later)
        if opp_stealth:
            damage = 0
            logs.append("Miss (stealth)")
        else:
            damage, is_crit = self.calculate_damage(atk, def_val, 1.0, 1.0, True, False)
            logs.append(f"{damage} dmg" + (" CRIT!" if is_crit else ""))
        
        return damage, "; ".join(logs), used_items
