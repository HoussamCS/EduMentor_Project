"""
Authentication Routes
POST /api/auth/register - Register new user
POST /api/auth/login - Login user
GET /api/auth/me - Get current user info
"""

import logging
import jwt
import os
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from functools import wraps

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)

# Secret key for JWT - in production, use environment variable
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "edumentor_secret_key_change_in_production")
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days


def create_token(user_id: str, username: str) -> str:
    """Create JWT token"""
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def verify_token(token: str) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return {"success": True, "payload": payload}
    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "Token has expired"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "Invalid token"}


def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authentication required"}), 401
        
        token = auth_header.split(" ")[1]
        result = verify_token(token)
        
        if not result["success"]:
            return jsonify({"error": result["message"]}), 401
        
        # Add user info to request
        request.user = result["payload"]
        return f(*args, **kwargs)
    
    return decorated_function


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user
    
    Request body:
        {
            "username": "string",
            "email": "string",
            "password": "string"
        }
    
    Response:
        {
            "message": "User created successfully",
            "token": "jwt_token",
            "user": {
                "user_id": "string",
                "username": "string",
                "email": "string"
            }
        }
    """
    try:
        data = request.get_json()
        
        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")
        
        # Validation
        if not username or len(username) < 3:
            return jsonify({"error": "Username must be at least 3 characters"}), 400
        
        if not email or "@" not in email:
            return jsonify({"error": "Valid email required"}), 400
        
        if not password or len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        # Create user
        from models.user import create_user
        result = create_user(username, email, password)
        
        if not result["success"]:
            return jsonify({"error": result["message"]}), 400
        
        # Generate token
        token = create_token(result["user_id"], username)
        
        return jsonify({
            "message": result["message"],
            "token": token,
            "user": {
                "user_id": result["user_id"],
                "username": username,
                "email": email
            }
        }), 201
        
    except Exception as e:
        logger.exception(f"Registration error: {e}")
        return jsonify({"error": "Registration failed", "details": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Login user
    
    Request body:
        {
            "username": "string",
            "password": "string"
        }
    
    Response:
        {
            "message": "Login successful",
            "token": "jwt_token",
            "user": {
                "user_id": "string",
                "username": "string",
                "email": "string"
            }
        }
    """
    try:
        data = request.get_json()
        
        username = data.get("username", "").strip()
        password = data.get("password", "")
        
        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
        
        # Verify credentials
        from models.user import verify_user
        result = verify_user(username, password)
        
        if not result["success"]:
            return jsonify({"error": result["message"]}), 401
        
        # Generate token
        token = create_token(result["user_id"], username)
        
        return jsonify({
            "message": result["message"],
            "token": token,
            "user": {
                "user_id": result["user_id"],
                "username": result["username"],
                "email": result["email"]
            }
        })
        
    except Exception as e:
        logger.exception(f"Login error: {e}")
        return jsonify({"error": "Login failed", "details": str(e)}), 500


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user():
    """
    Get current user information
    Requires: Authorization: Bearer <token>
    
    Response:
        {
            "user": {
                "user_id": "string",
                "username": "string"
            }
        }
    """
    try:
        return jsonify({
            "user": {
                "user_id": request.user["user_id"],
                "username": request.user["username"]
            }
        })
    except Exception as e:
        logger.exception(f"Get user error: {e}")
        return jsonify({"error": "Failed to get user info"}), 500
