"""
User Model - Simple file-based user storage
For production, use a proper database like PostgreSQL or MongoDB
"""

import json
import os
import hashlib
from datetime import datetime

USERS_FILE = os.path.join(os.path.dirname(__file__), "users.json")


def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


def load_users():
    """Load users from JSON file"""
    if not os.path.exists(USERS_FILE):
        return {}
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}


def save_users(users):
    """Save users to JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)


def create_user(username: str, email: str, password: str) -> dict:
    """
    Create a new user
    Returns: {"success": bool, "message": str, "user_id": str}
    """
    users = load_users()
    
    # Check if username already exists
    if username in users:
        return {"success": False, "message": "Username already exists"}
    
    # Check if email already exists
    for user_data in users.values():
        if user_data.get("email") == email:
            return {"success": False, "message": "Email already registered"}
    
    # Create new user
    user_id = f"user_{len(users) + 1}_{int(datetime.now().timestamp())}"
    users[username] = {
        "user_id": user_id,
        "username": username,
        "email": email,
        "password": hash_password(password),
        "created_at": datetime.now().isoformat(),
        "conversations": [],
        "analytics_history": []
    }
    
    save_users(users)
    return {"success": True, "message": "User created successfully", "user_id": user_id}


def verify_user(username: str, password: str) -> dict:
    """
    Verify user credentials
    Returns: {"success": bool, "message": str, "user_id": str, "username": str}
    """
    users = load_users()
    
    if username not in users:
        return {"success": False, "message": "Invalid username or password"}
    
    user_data = users[username]
    if user_data["password"] != hash_password(password):
        return {"success": False, "message": "Invalid username or password"}
    
    return {
        "success": True,
        "message": "Login successful",
        "user_id": user_data["user_id"],
        "username": username,
        "email": user_data["email"]
    }


def get_user_by_id(user_id: str) -> dict:
    """Get user data by user ID"""
    users = load_users()
    for username, user_data in users.items():
        if user_data["user_id"] == user_id:
            return {
                "user_id": user_id,
                "username": username,
                "email": user_data["email"]
            }
    return None


def get_user_by_username(username: str) -> dict:
    """Get user data by username"""
    users = load_users()
    if username in users:
        user_data = users[username]
        return {
            "user_id": user_data["user_id"],
            "username": username,
            "email": user_data["email"]
        }
    return None
