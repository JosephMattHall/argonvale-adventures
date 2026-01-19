from app.db.session import Base, engine
from app.models import User, Companion, Item

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Tables created.")
