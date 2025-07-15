from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
import jwt
from datetime import datetime, timedelta
import bcrypt

# Initialize FastAPI app
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URL)
db = client.center_french

# Security
security = HTTPBearer()
SECRET_KEY = "center-french-secret-key-2024"

# Pydantic models
class Gear(BaseModel):
    id: str
    name: str
    nickname: str
    gear_id: str
    image_url: str
    description: str
    category: str  # joueurs, moderateur, evenements, interdits

class GearCreate(BaseModel):
    name: str
    nickname: str
    gear_id: str
    image_url: str
    description: str
    category: str

class GearUpdate(BaseModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
    gear_id: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None

class Suggestion(BaseModel):
    id: str
    name: str
    nickname: str
    gear_id: str
    image_url: str
    description: str
    category: str
    status: str  # pending, approved, rejected
    created_at: datetime

class SuggestionCreate(BaseModel):
    name: str
    nickname: str
    gear_id: str
    image_url: str
    description: str
    category: str

class User(BaseModel):
    username: str
    role: str  # moderateur, responsable, createur

class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(username: str, role: str) -> str:
    payload = {
        "username": username,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        username = payload.get("username")
        role = payload.get("role")
        if username is None or role is None:
            raise HTTPException(status_code=401, detail="Token invalide")
        return User(username=username, role=role)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# Initialize database with sample data
@app.on_event("startup")
async def startup_event():
    # Create admin user if doesn't exist
    if not db.users.find_one({"username": "admin"}):
        admin_user = {
            "username": "admin",
            "password": hash_password("admin123"),
            "role": "createur"
        }
        db.users.insert_one(admin_user)
    
    # Create sample gears if collection is empty
    if db.gears.count_documents({}) == 0:
        sample_gears = [
            # Joueurs
            {
                "id": str(uuid.uuid4()),
                "name": "Sword of Light",
                "nickname": "Épée Lumière",
                "gear_id": "123456789",
                "image_url": "https://tr.rbxcdn.com/6b9243f5a6b3fa1b54b12c4f1e7f77e4/420/420/Hat/Png",
                "description": "Une épée brillante qui émet de la lumière",
                "category": "joueurs"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Basic Shield",
                "nickname": "Bouclier Basique",
                "gear_id": "987654321",
                "image_url": "https://tr.rbxcdn.com/8c5243f5a6b3fa1b54b12c4f1e7f66e5/420/420/Hat/Png",
                "description": "Un bouclier simple mais efficace",
                "category": "joueurs"
            },
            # Modérateur
            {
                "id": str(uuid.uuid4()),
                "name": "Admin Baton",
                "nickname": "Bâton Admin",
                "gear_id": "456789123",
                "image_url": "https://tr.rbxcdn.com/9d6243f5a6b3fa1b54b12c4f1e7f88e6/420/420/Hat/Png",
                "description": "Bâton spécial pour les modérateurs",
                "category": "moderateur"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Moderator Cape",
                "nickname": "Cape Modo",
                "gear_id": "789123456",
                "image_url": "https://tr.rbxcdn.com/ae7243f5a6b3fa1b54b12c4f1e7f99e7/420/420/Hat/Png",
                "description": "Cape distinctive des modérateurs",
                "category": "moderateur"
            },
            # Événements
            {
                "id": str(uuid.uuid4()),
                "name": "Event Crown",
                "nickname": "Couronne Événement",
                "gear_id": "321654987",
                "image_url": "https://tr.rbxcdn.com/bf8243f5a6b3fa1b54b12c4f1e7faae8/420/420/Hat/Png",
                "description": "Couronne spéciale pour les événements",
                "category": "evenements"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Party Launcher",
                "nickname": "Lance-Fête",
                "gear_id": "654987321",
                "image_url": "https://tr.rbxcdn.com/cg9243f5a6b3fa1b54b12c4f1e7fbbbe9/420/420/Hat/Png",
                "description": "Lance des confettis pour les fêtes",
                "category": "evenements"
            },
            # Interdits
            {
                "id": str(uuid.uuid4()),
                "name": "Banned Weapon",
                "nickname": "Arme Interdite",
                "gear_id": "111222333",
                "image_url": "https://tr.rbxcdn.com/dh0243f5a6b3fa1b54b12c4f1e7fcccea/420/420/Hat/Png",
                "description": "Arme trop puissante, interdite d'utilisation",
                "category": "interdits"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Exploit Tool",
                "nickname": "Outil Exploit",
                "gear_id": "444555666",
                "image_url": "https://tr.rbxcdn.com/ei1243f5a6b3fa1b54b12c4f1e7fdddeb/420/420/Hat/Png",
                "description": "Outil causant des bugs, strictement interdit",
                "category": "interdits"
            }
        ]
        db.gears.insert_many(sample_gears)

# Auth endpoints
@app.post("/api/auth/login")
async def login(user_data: UserLogin):
    user = db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Nom d'utilisateur ou mot de passe incorrect")
    
    token = create_access_token(user["username"], user["role"])
    return {"access_token": token, "token_type": "bearer", "role": user["role"]}

@app.post("/api/auth/create-user")
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role == "moderateur":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    if current_user.role == "responsable" and user_data.role not in ["moderateur"]:
        raise HTTPException(status_code=403, detail="Vous ne pouvez créer que des comptes modérateur")
    
    if db.users.find_one({"username": user_data.username}):
        raise HTTPException(status_code=400, detail="Nom d'utilisateur déjà existant")
    
    hashed_password = hash_password(user_data.password)
    new_user = {
        "username": user_data.username,
        "password": hashed_password,
        "role": user_data.role
    }
    db.users.insert_one(new_user)
    return {"message": "Utilisateur créé avec succès"}

# Gear endpoints
@app.get("/api/gears")
async def get_gears(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    
    gears = list(db.gears.find(query, {"_id": 0}))
    return gears

@app.get("/api/gears/{gear_id}")
async def get_gear(gear_id: str):
    gear = db.gears.find_one({"id": gear_id}, {"_id": 0})
    if not gear:
        raise HTTPException(status_code=404, detail="Gear non trouvé")
    return gear

@app.post("/api/gears")
async def create_gear(gear_data: GearCreate, current_user: User = Depends(get_current_user)):
    if current_user.role == "moderateur":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    new_gear = {
        "id": str(uuid.uuid4()),
        "name": gear_data.name,
        "nickname": gear_data.nickname,
        "gear_id": gear_data.gear_id,
        "image_url": gear_data.image_url,
        "description": gear_data.description,
        "category": gear_data.category
    }
    db.gears.insert_one(new_gear)
    return {"message": "Gear créé avec succès", "gear": new_gear}

@app.put("/api/gears/{gear_id}")
async def update_gear(gear_id: str, gear_data: GearUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role == "moderateur":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    gear = db.gears.find_one({"id": gear_id})
    if not gear:
        raise HTTPException(status_code=404, detail="Gear non trouvé")
    
    update_data = {k: v for k, v in gear_data.dict().items() if v is not None}
    db.gears.update_one({"id": gear_id}, {"$set": update_data})
    return {"message": "Gear mis à jour avec succès"}

@app.delete("/api/gears/{gear_id}")
async def delete_gear(gear_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role == "moderateur":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    result = db.gears.delete_one({"id": gear_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gear non trouvé")
    return {"message": "Gear supprimé avec succès"}

# Suggestion endpoints
@app.post("/api/suggestions")
async def create_suggestion(suggestion_data: SuggestionCreate):
    new_suggestion = {
        "id": str(uuid.uuid4()),
        "name": suggestion_data.name,
        "nickname": suggestion_data.nickname,
        "gear_id": suggestion_data.gear_id,
        "image_url": suggestion_data.image_url,
        "description": suggestion_data.description,
        "category": suggestion_data.category,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    db.suggestions.insert_one(new_suggestion)
    return {"message": "Suggestion soumise avec succès"}

@app.get("/api/suggestions")
async def get_suggestions(current_user: User = Depends(get_current_user)):
    suggestions = list(db.suggestions.find({}, {"_id": 0}))
    return suggestions

@app.post("/api/suggestions/{suggestion_id}/approve")
async def approve_suggestion(suggestion_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role == "moderateur":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    suggestion = db.suggestions.find_one({"id": suggestion_id})
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion non trouvée")
    
    # Create gear from suggestion
    new_gear = {
        "id": str(uuid.uuid4()),
        "name": suggestion["name"],
        "nickname": suggestion["nickname"],
        "gear_id": suggestion["gear_id"],
        "image_url": suggestion["image_url"],
        "description": suggestion["description"],
        "category": suggestion["category"]
    }
    db.gears.insert_one(new_gear)
    
    # Update suggestion status
    db.suggestions.update_one({"id": suggestion_id}, {"$set": {"status": "approved"}})
    
    return {"message": "Suggestion approuvée et gear créé"}

@app.post("/api/suggestions/{suggestion_id}/reject")
async def reject_suggestion(suggestion_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role == "moderateur":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    db.suggestions.update_one({"id": suggestion_id}, {"$set": {"status": "rejected"}})
    return {"message": "Suggestion rejetée"}

@app.delete("/api/suggestions/{suggestion_id}")
async def delete_suggestion(suggestion_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role == "moderateur":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    result = db.suggestions.delete_one({"id": suggestion_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Suggestion non trouvée")
    return {"message": "Suggestion supprimée"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)