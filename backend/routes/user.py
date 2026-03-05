"""
User Conversations Routes
GET /api/user/conversations - Get all user conversations
POST /api/user/conversations - Save a conversation
DELETE /api/user/conversations/:id - Delete a conversation
"""

import logging
from flask import Blueprint, request, jsonify
from routes.auth import require_auth

logger = logging.getLogger(__name__)

user_bp = Blueprint("user", __name__)


@user_bp.route("/conversations", methods=["GET"])
@require_auth
def get_conversations():
    """
    Get all conversations for the authenticated user
    Requires: Authorization: Bearer <token>
    """
    try:
        from models.user_data import get_user_conversations
        
        user_id = request.user["user_id"]
        conversations = get_user_conversations(user_id)
        
        return jsonify({"conversations": conversations})
        
    except Exception as e:
        logger.exception(f"Get conversations error: {e}")
        return jsonify({"error": "Failed to get conversations"}), 500


@user_bp.route("/conversations", methods=["POST"])
@require_auth
def save_conversation():
    """
    Save or update a conversation
    Requires: Authorization: Bearer <token>
    
    Request body:
        {
            "conversation_id": "string",
            "title": "string",
            "messages": [...]
        }
    """
    try:
        from models.user_data import save_conversation as save_conv
        
        data = request.get_json()
        user_id = request.user["user_id"]
        
        conversation_id = data.get("conversation_id")
        title = data.get("title", "New Conversation")
        messages = data.get("messages", [])
        
        if not conversation_id:
            return jsonify({"error": "conversation_id required"}), 400
        
        save_conv(user_id, conversation_id, messages, title)
        
        return jsonify({"message": "Conversation saved successfully"})
        
    except Exception as e:
        logger.exception(f"Save conversation error: {e}")
        return jsonify({"error": "Failed to save conversation"}), 500


@user_bp.route("/conversations/<conversation_id>", methods=["DELETE"])
@require_auth
def delete_conversation_route(conversation_id):
    """
    Delete a conversation
    Requires: Authorization: Bearer <token>
    """
    try:
        from models.user_data import delete_conversation
        
        user_id = request.user["user_id"]
        delete_conversation(user_id, conversation_id)
        
        return jsonify({"message": "Conversation deleted successfully"})
        
    except Exception as e:
        logger.exception(f"Delete conversation error: {e}")
        return jsonify({"error": "Failed to delete conversation"}), 500


@user_bp.route("/analytics", methods=["GET"])
@require_auth
def get_analytics():
    """
    Get analytics history for the authenticated user
    Requires: Authorization: Bearer <token>
    """
    try:
        from models.user_data import get_user_analytics
        
        user_id = request.user["user_id"]
        analytics = get_user_analytics(user_id)
        
        return jsonify({"analytics": analytics})
        
    except Exception as e:
        logger.exception(f"Get analytics error: {e}")
        return jsonify({"error": "Failed to get analytics"}), 500
