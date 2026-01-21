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
    Clears existing shop items (is_template=False, owner_id=None)
    and stocks 10 items for each category based on rarity weights.
    """
    try:
        logger.info("Starting shop restock...")
        
        # 1. Clear current listings (only system items that aren't templates)
        db.query(Item).filter(Item.owner_id == None, Item.is_template == False).delete()
        
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
            
            # Select 10 items for this category
            for _ in range(10):
                # Pick a rarity based on weights
                rarity = random.choices(
                    list(RARITY_WEIGHTS.keys()), 
                    weights=list(RARITY_WEIGHTS.values()), 
                    k=1
                )[0]
                
                # Filter templates by rarity
                eligible = [t for t in cat_templates if t.rarity == rarity]
                
                # If no templates for that rarity, fallback to Common
                if not eligible:
                    eligible = [t for t in cat_templates if t.rarity == "Common"]
                
                if eligible:
                    template = random.choice(eligible)
                    
                    # Create shop listing
                    min_s, max_s = STOCK_AMOUNTS.get(rarity, (1, 1))
                    stock = random.randint(min_s, max_s)
                    
                    # Relic items: limit to 1 total in shop if picked
                    if rarity == "Relic":
                        stock = 1
                    
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
                        stock=stock,
                        is_template=False,
                        owner_id=None
                    )
                    db.add(new_listing)
        
        db.commit()
        logger.info("Shop restocking complete.")
        
    except Exception as e:
        logger.error(f"Restocking error: {e}")
        db.rollback()
