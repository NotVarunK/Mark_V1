import os
import bcrypt
from app.database import SessionLocal, Base, engine
from app.models import User, Role

def seed_db():
    # Ensure all tables are created
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        admin_emails = ['admin@college.edu.in', 'admin@despu.edu.in']
        admin_password = os.getenv("ADMIN_PASSWORD", "adpass@9821")
        
        # Hash password using native bcrypt
        pwd_bytes = admin_password.encode('utf-8')
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')
        
        for admin_email in admin_emails:
            # Check if user exists
            admin = db.query(User).filter(User.email == admin_email).first()
            
            name = 'System Admin' if admin_email == 'admin@college.edu.in' else 'admin'
            if admin:
                print(f"Admin user {admin_email} already exists, updating...")
                admin.name = name
                admin.password_hash = password_hash
                admin.role = Role.ADMIN
            else:
                print(f"Creating admin user: {admin_email}")
                admin = User(
                    name=name,
                    email=admin_email,
                    password_hash=password_hash,
                    role=Role.ADMIN
                )
                db.add(admin)
            
        db.commit()
        print("Seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print("Seeding failed:", e)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
