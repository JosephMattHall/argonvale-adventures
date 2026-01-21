    def _process_pvp_turn(self, session: CombatSession) -> list[GameEvent]:
        """Process a PvP turn where both players have submitted their actions"""
        import time
        
        events = []
        
        # Get both actions
        p1_action = session.pending_actions.get(session.attacker_id)
        p2_action = session.pending_actions.get(session.defender_id)
        
        if not p1_action or not p2_action:
            return []  # Should never happen due to earlier check
        
        # TODO: For MVP, we'll process damage simultaneously
        # Future: Speed-based turn order, interrupt mechanics, etc.
        
        # Process Player 1's action against Player 2
        p1_damage, p1_log, p1_used_items = self._calculate_action_result(
            session, p1_action, is_attacker=True
        )
        session.enemy_hp -= p1_damage  # In PvP, enemy = other player
        
        # Process Player 2's action against Player 1
        p2_damage, p2_log, p2_used_items = self._calculate_action_result(
            session, p2_action, is_attacker=False
        )
        session.player_hp -= p2_damage
        
        # Combine logs
        combined_log = f"{p1_log}\\n{p2_log}"
        
        # Increment turn
        session.turn += 1
        
        # Create turn result for Player 1 perspective
        turn_event_p1 = TurnProcessed.create(
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
        
        events.append(turn_event_p1)
        
        # Check win conditions
        if session.player_hp <= 0:
            winner_id = session.defender_id
            end_event = CombatEnded.create(
                combat_id=session.combat_id,
                winner_id=winner_id,
                mode="pvp",
                xp_gained=0  # PvP XP handled separately
            )
            events.append(end_event)
            del self.sessions[session.combat_id]
            
        elif session.enemy_hp <= 0:
            winner_id = session.attacker_id
            end_event = CombatEnded.create(
                combat_id=session.combat_id,
                winner_id=winner_id,
                mode="pvp",
                xp_gained=0
            )
            events.append(end_event)
            del self.sessions[session.combat_id]
        
        return events
    
    def _calculate_action_result(self, session: CombatSession, action: CombatAction, is_attacker: bool) -> tuple[int, str, set]:
        """Calculate damage and effects from a player's action
        
        Returns: (damage, log_message, used_item_ids)
        """
        damage = 0
        logs = []
        used_items = set()
        
        # Get player stats based on perspective
        if is_attacker:
            atk_stat = session.player_stats.get("str", 10)
            def_stat = session.enemy_stats.get("def", 5)
            player_frozen = session.turn <= session.player_frozen_until
            enemy_stealth = session.turn <= session.enemy_stealth_until
        else:
            atk_stat = session.enemy_stats.get("str", 10)
            def_stat = session.player_stats.get("def", 5)
            player_frozen = session.turn <= session.enemy_frozen_until
            enemy_stealth = session.turn <= session.player_stealth_until
        
        # Check frozen status
        if player_frozen:
            logs.append("Frozen! Cannot act!")
            return 0, "; ".join(logs), used_items
        
        # Process items/weapons from action
        selected_ids = getattr(action, 'item_ids', [])
        if not selected_ids and getattr(action, 'item_id', None):
            selected_ids = [action.item_id]
        
        # For PvP, we need to determine which equipment list to use
        # This is complex - for MVP, simplified approach:
        base_damage = atk_stat
        
        # Simple damage calculation (will enhance with items later)
        if enemy_stealth:
            damage = 0
            logs.append("Attack missed (stealth)!")
        else:
            damage, is_crit = self.calculate_damage(
                base_atk=base_damage,
                defender_def=def_stat,
                stance_atk_mod=1.0,  # Simplified
                stance_def_mod=1.0,
                is_player=True,
                defender_stealth=enemy_stealth
            )
            logs.append(f"Dealt {damage} damage" + (" (CRIT!)" if is_crit else ""))
        
        return damage, "; ".join(logs), used_items
