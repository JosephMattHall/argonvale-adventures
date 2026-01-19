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
        self.mode = event.mode
        
        # Player Stats (From Context - now passed from DB)
        self.companion_id = event.context.get("companion_id")
        self.player_hp = event.context.get("player_hp", 100)
        self.player_max_hp = event.context.get("player_max_hp", 100)
        self.player_stats = event.context.get("player_stats", {"str": 10, "def": 5})

        # Enemy Stats (From Context)
        self.enemy_name = event.context.get("enemy_name", "Unknown")
        self.enemy_hp = event.context.get("enemy_hp", 50)
        self.enemy_max_hp = event.context.get("enemy_max_hp", 50)
        self.enemy_stats = event.context.get("enemy_stats", {"STR": 5, "DEF": 2})
        self.enemy_weapons = event.context.get("enemy_weapons", [])
        self.enemy_items = event.context.get("enemy_items", [])
        self.equipped_items = event.context.get("equipped_items", [])

        self.turn = 1

class CombatProcessor(BaseProcessor):
    def __init__(self):
        super().__init__()
        self.sessions = {} # combat_id -> CombatSession

    def calculate_damage(self, base_atk: int, defender_def: int, stance_atk_mod: float, stance_def_mod: float, is_player: bool) -> tuple[int, bool]:
        """
        New balanced formula: Damage = BaseAtk * (20 / (20 + Def)) * StanceMod * Variance
        """
        # 1. Critical Hit (5% chance)
        is_crit = random.random() < 0.05
        crit_mult = 1.5 if is_crit else 1.0

        # 2. Variance (0.9 to 1.1)
        variance = random.uniform(0.9, 1.1)

        # 3. Defense Mitigation (Diminishing Returns)
        # Using a constant of 20 for the denominator to scale with starting stats (5-10)
        mitigation = 20 / (20 + (defender_def * stance_def_mod))
        
        raw_dmg = base_atk * mitigation * stance_atk_mod * variance * crit_mult
        
        return max(1, int(raw_dmg)), is_crit

    def process(self, state: any, event: GameEvent) -> list[GameEvent]:
        events = []

        if isinstance(event, CombatStarted):
            session = CombatSession(event)
            self.sessions[session.combat_id] = session
            # Note: We should ideally load equipped items here too, 
            # but for MVP we'll pass item stats in the action if needed 
            # or fetch them from DB during the turn processing.
        
        elif isinstance(event, CombatAction):
            session = self.sessions.get(event.combat_id)
            if not session: return []

            # 1. Player Turn
            damage_dealt = 0
            log = ""

            if event.action_type == "use_item":
                # Find the item in the companion's equipped items or inventory
                # For this turn, we look it up from the 'context' or session data.
                item = next((i for i in session.equipped_items if i.get("id") == event.item_id), None)
                
                if item:
                    item_stats = item.get("stats", {})
                    restore_amt = 0
                    
                    if "heal" in item_stats:
                        restore_amt = item_stats["heal"]
                    elif "heal_pct" in item_stats:
                        restore_amt = int(session.player_max_hp * (item_stats["heal_pct"] / 100))
                    
                    session.player_hp = min(session.player_hp + restore_amt, session.player_max_hp)
                    log = f"Using {item.get('name')}, you restore {restore_amt} HP!"
                else:
                    # Fallback for manual testing or old data
                    restore_amt = 40
                    session.player_hp = min(session.player_hp + restore_amt, session.player_max_hp)
                    log = f"Using a healing scroll, you restore {restore_amt} HP!"
            else:
                # Default: Attack
                # Base stats from companion
                base_str = session.player_stats.get("str", 10)
                base_def = session.player_stats.get("def", 5)
                
                # Sum icons from equipped gear
                # and filter for only weapons used in the current attack
                atk_icons = 0
                def_icons = 0
                
                # Fetch gear from context (we stored it in session if we added it there, 
                # or we can pull it from the event.context if available).
                # The CombatSession needs to store the equipped items.
                equipped_gear = getattr(session, 'equipped_items', [])
                
                # For simplicity in this turn, we'll sum all icons from items that are 'weapons' or 'armor'
                # but specifically matching the weapon_ids chosen for this attack.
                for item in equipped_gear:
                    if item.get("id") in event.weapon_ids or item.get("item_type") == "armor":
                        stats = item.get("stats", {})
                        atk_icons += sum(stats.get("atk", {}).values())
                        def_icons += sum(stats.get("def", {}).values())
                
                total_atk = base_str + atk_icons
                # Total player defense for this turn (base + gear)
                # This affects the AI's counter-attack
                current_player_def = base_def + def_icons

                # Stance Modifiers
                stance_atk_mod = 1.0
                stance_def_mod = 1.0
                if event.stance == "berserk":
                    stance_atk_mod = 1.2
                    stance_def_mod = 0.8
                elif event.stance == "defensive":
                    stance_atk_mod = 0.8
                    stance_def_mod = 1.2

                enemy_def = session.enemy_stats.get("DEF", 5)
                # Check for AI armor/defense icons too
                ai_def_icons = sum(sum(i.get("stats", {}).get("def", {}).values()) for i in session.enemy_items if i.get("item_type") == "armor")
                total_enemy_def = enemy_def + ai_def_icons
                
                damage_dealt, crit = self.calculate_damage(total_atk, total_enemy_def, stance_atk_mod, 1.0, True)
                session.enemy_hp -= damage_dealt
                
                crit_text = "CRITICAL HIT! " if crit else ""
                log = f"{crit_text}Using {event.stance} stance, you deal {damage_dealt} damage!"
                
                # Store player defensiveness for the AI turn check
                session.current_player_def = current_player_def
                session.current_stance_def_mod = stance_def_mod

            events.append(TurnProcessed.create(
                combat_id=session.combat_id,
                turn_number=session.turn,
                actor_id=event.actor_id,
                damage_dealt=damage_dealt,
                description=log,
                attacker_hp=session.player_hp,
                defender_hp=session.enemy_hp
            ))

            if session.enemy_hp <= 0:
                # XP Calculation: (Enemy STR * 2) + 10
                xp_gain = (session.enemy_stats.get("STR", 5) * 2) + 10
                
                # Loot Drops: 25% chance for a random item from their own pool (if they have items)
                # OR a random tier 1 item. For now, let's drop one of THEIR items if they have any.
                dropped = None
                if random.random() < 0.25 and session.enemy_items:
                    dropped = random.choice(session.enemy_items)
                
                events.append(CombatEnded.create(
                    combat_id=session.combat_id,
                    winner_id=event.actor_id,
                    loot={"coins": random.randint(15, 30)},
                    dropped_item=dropped,
                    xp_gained=xp_gain
                ))
                del self.sessions[session.combat_id]
                return events

            # 2. AI Turn
            ai_str = session.enemy_stats.get("STR", 5)
            # Use stored defensiveness or default to base
            player_def = getattr(session, 'current_player_def', session.player_stats.get("def", 5))
            stance_def_mod = getattr(session, 'current_stance_def_mod', 1.0)
            
            # AI BEHAVIOR OVERHAUL: Weighted Decision Tree
            ai_action_log = ""
            hp_percent = (session.enemy_hp / session.enemy_max_hp) * 100
            
            # Determine Action Category
            # 60% Attack, 25% Defend, 15% Consumable/Support
            rand = random.random()
            
            # --- ACTION SELECTION ---
            if rand < 0.15: # 15% Support/Consumable
                heal_item = next((i for i in session.enemy_items if i.get("type") == "heal"), None)
                if hp_percent < 40 and heal_item:
                    restore = heal_item.get("value", 20)
                    session.enemy_hp = min(session.enemy_hp + restore, session.enemy_max_hp)
                    ai_action_log = f"{session.enemy_name} used {heal_item.get('name')} and restored {restore} HP!"
                    session.enemy_items.remove(heal_item)
                else:
                    block_item = next((i for i in session.enemy_items if i.get("type") == "block"), None)
                    if block_item:
                        ai_action_log = f"{session.enemy_name} hunker down behind its {block_item.get('name')}!"
                        session.enemy_items.remove(block_item)
                    else:
                        # Fallback to attack if no consumables
                        rand = 0.5 
            
            # Recalculate if it fell back or if it's in the 25% Defend zone
            if ai_action_log == "":
                # Random Stance Selection for all actions
                # Berserk (1.2x Atk / 0.8x Def), Defensive (0.8x Atk / 1.2x Def), Normal
                ai_stances = ["normal", "berserk", "defensive"]
                ai_stance = random.choice(ai_stances)
                
                ai_atk_mod = 1.0
                ai_def_mod = 1.0
                if ai_stance == "berserk":
                    ai_atk_mod = 1.2
                    ai_def_mod = 0.8
                elif ai_stance == "defensive":
                    ai_atk_mod = 0.8
                    ai_def_mod = 1.2

                ai_atk_icons = 0
                ai_def_icons = 0
                
                # Separate pool for tactical selection
                weapon_pool = []
                defensive_pool = []
                
                all_gear = session.enemy_weapons + session.enemy_items
                for item in all_gear:
                    stats = item.get("stats", {})
                    if not stats: continue
                    atk_val = sum(stats.get("atk", {}).values())
                    def_val = sum(stats.get("def", {}).values())
                    
                    if atk_val > 0:
                        weapon_pool.append({"item": item, "atk": atk_val, "def": def_val})
                    if def_val > 0:
                        defensive_pool.append({"item": item, "atk": atk_val, "def": def_val})

                # --- 25% DEFEND OR 60% ATTACK ---
                if rand < 0.40: # 15% + 25% = 40% threshold for Defense focus
                    # DEFENSE FOCUS: Pick top 2 defense items, use defensive stance
                    ai_stance = "defensive" # Override
                    ai_atk_mod, ai_def_mod = 0.8, 1.2
                    
                    defensive_pool.sort(key=lambda x: x["def"], reverse=True)
                    selected = defensive_pool[:2]
                    for s in selected:
                        ai_def_icons += s["def"]
                        ai_atk_icons += s["atk"]
                    
                    # Still do a weak counter-attack
                    total_ai_atk = ai_str + ai_atk_icons
                    ai_final_dmg, ai_crit = self.calculate_damage(total_ai_atk, player_def, ai_atk_mod, stance_def_mod, False)
                    session.player_hp -= ai_final_dmg
                    
                    names = [s["item"].get("name") for s in selected]
                    using_text = f" with its {', '.join(names)}" if names else ""
                    ai_action_log = f"{session.enemy_name} takes a defensive stance{using_text}, dealing {ai_final_dmg} chip damage!"
                
                else:
                    # ATTACK FOCUS (60%): Top 2 weapons, random stance
                    weapon_pool.sort(key=lambda x: x["atk"], reverse=True)
                    selected = weapon_pool[:2]
                    for s in selected:
                        ai_atk_icons += s["atk"]
                        ai_def_icons += s["def"]
                    
                    total_ai_atk = ai_str + ai_atk_icons
                    ai_final_dmg, ai_crit = self.calculate_damage(total_ai_atk, player_def, ai_atk_mod, stance_def_mod, False)
                    session.player_hp -= ai_final_dmg
                    
                    crit_text = "CRITICAL! " if ai_crit else ""
                    stance_text = f" in {ai_stance} stance" if ai_stance != "normal" else ""
                    wp_names = [s["item"].get("name") for s in selected]
                    using_text = f" using {', '.join(wp_names)}" if wp_names else ""
                    ai_action_log = f"{crit_text}{session.enemy_name} attacks{stance_text}{using_text} for {ai_final_dmg} damage!"
            
            events.append(TurnProcessed.create(
                combat_id=session.combat_id,
                turn_number=session.turn,
                actor_id=0,
                damage_dealt=ai_final_dmg,
                description=ai_action_log,
                attacker_hp=session.player_hp,
                defender_hp=session.enemy_hp
            ))

            if session.player_hp <= 0:
                 session.player_hp = 0
                 events.append(CombatEnded.create(
                    combat_id=session.combat_id,
                    winner_id=0,
                ))
                 del self.sessions[session.combat_id]
            else:
                session.turn += 1

        return events
