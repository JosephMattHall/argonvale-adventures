import random
from sqlalchemy.orm import Session
from app.models.item import Item
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Rarity Weights (requested percentages)
RARITY_WEIGHTS = {
    "Common": 0.60,
    "Uncommon": 0.25,
    "Rare": 0.10,
    "Ultra Rare": 0.045,
    "Relic": 0.005
}

# Stock Amount per Rarity
STOCK_AMOUNTS = {
    "Common": (5, 10),
    "Uncommon": (3, 5),
    "Rare": (1, 2),
    "Ultra Rare": (1, 1),
    "Relic": (1, 1)
}

def restock_shop(db: Session):
    """
    Cleans up duplicate shop items and adds new stock additive-ly.
    Uses unique templates per category and updates existing stock for selected items.
    """
    try:
        logger.info("Starting shop restock...")
        
        # 1. Cleanup Duplicates: Merge existing system items with the same name and rarity
        current_listings = db.query(Item).filter(Item.owner_id == None, Item.is_template == False).all()
        unique_map = {} # (name, rarity) -> Item
        
        for item in current_listings:
            key = (item.name, item.rarity)
            if key in unique_map:
                # Duplicate found! Merge stock and delete
                unique_map[key].stock += item.stock
                db.delete(item)
            else:
                unique_map[key] = item
        
        db.flush() 
        
        # 2. Get all templates
        templates = db.query(Item).filter(Item.is_template == True).all()
        if not templates:
            logger.warning("No item templates found to restock from.")
            return

        categories = ["weapons", "armor", "food", "utility"]
        
        for cat in categories:
            cat_templates = [t for t in templates if t.category == cat]
            if not cat_templates:
                continue
            
            # Select up to 10 unique items for this category
            available_templates = cat_templates.copy()
            category_selection = []
            
            for _ in range(min(10, len(cat_templates))):
                if not available_templates:
                    break
                    
                rarity = random.choices(
                    list(RARITY_WEIGHTS.keys()), 
                    weights=list(RARITY_WEIGHTS.values()), 
                    k=1
                )[0]
                
                eligible = [t for t in available_templates if t.rarity == rarity]
                if not eligible:
                    eligible = available_templates
                
                template = random.choice(eligible)
                category_selection.append(template)
                available_templates.remove(template) 
                
            for template in category_selection:
                existing = unique_map.get((template.name, template.rarity))
                
                min_s, max_s = STOCK_AMOUNTS.get(template.rarity, (1, 1))
                new_stock = random.randint(min_s, max_s)
                
                if template.rarity == "Relic":
                    new_stock = 1

                if existing:
                    existing.stock += new_stock
                else:
                    new_listing = Item(
                        name=template.name,
                        item_type=template.item_type,
                        description=template.description,
                        image_url=template.image_url,
                        category=template.category,
                        weapon_stats=template.weapon_stats,
                        effect=template.effect,
                        price=template.price,
                        rarity=template.rarity,
                        stock=new_stock,
                        is_template=False,
                        owner_id=None
                    )
                    db.add(new_listing)
                    unique_map[(template.name, template.rarity)] = new_listing

        db.commit()
        logger.info("Shop restocking complete.")
        
    except Exception as e:
        logger.error(f"Restocking error: {e}")
        db.rollback()
