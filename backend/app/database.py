import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

from urllib.parse import urlparse, parse_qs, urlunparse, urlencode

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
    
    # Clean up Prisma connection query parameters like schema=public
    parsed = urlparse(DATABASE_URL)
    if parsed.query:
        query_params = parse_qs(parsed.query)
        query_params.pop("schema", None)
        new_query = urlencode(query_params, doseq=True)
        DATABASE_URL = urlunparse(parsed._replace(query=new_query))

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
