"""
User Data Storage - Conversations and Analytics
Stores user-specific chat conversations and analytics data
"""

import json
import os
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "user_data")

# Create data directory if it doesn't exist
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)


def get_user_data_file(user_id: str) -> str:
    """Get the file path for user's data"""
    return os.path.join(DATA_DIR, f"{user_id}.json")


def load_user_data(user_id: str) -> dict:
    """Load user's data from file"""
    file_path = get_user_data_file(user_id)
    
    if not os.path.exists(file_path):
        # Initialize with default structure
        default_data = {
            "user_id": user_id,
            "conversations": [],
            "analytics_history": []
        }
        save_user_data(user_id, default_data)
        return default_data
    
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except:
        return {
            "user_id": user_id,
            "conversations": [],
            "analytics_history": []
        }


def save_user_data(user_id: str, data: dict):
    """Save user's data to file"""
    file_path = get_user_data_file(user_id)
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)


# Conversation management
def save_conversation(user_id: str, conversation_id: str, messages: list, title: str = "New Conversation"):
    """Save or update a conversation for a user"""
    data = load_user_data(user_id)
    
    # Check if conversation exists
    conversation_exists = False
    for conv in data["conversations"]:
        if conv["id"] == conversation_id:
            conv["messages"] = messages
            conv["title"] = title
            conv["updated_at"] = datetime.now().isoformat()
            conversation_exists = True
            break
    
    # If not exists, create new
    if not conversation_exists:
        data["conversations"].append({
            "id": conversation_id,
            "title": title,
            "messages": messages,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        })
    
    save_user_data(user_id, data)


def get_user_conversations(user_id: str) -> list:
    """Get all conversations for a user"""
    data = load_user_data(user_id)
    return data.get("conversations", [])


def delete_conversation(user_id: str, conversation_id: str):
    """Delete a conversation"""
    data = load_user_data(user_id)
    data["conversations"] = [c for c in data["conversations"] if c["id"] != conversation_id]
    save_user_data(user_id, data)


# Analytics management
def save_analytics_result(user_id: str, analysis_data: dict):
    """Save analytics result for a user"""
    data = load_user_data(user_id)
    
    analysis_data["timestamp"] = datetime.now().isoformat()
    data["analytics_history"].append(analysis_data)
    
    save_user_data(user_id, data)


def get_user_analytics(user_id: str) -> list:
    """Get all analytics results for a user"""
    data = load_user_data(user_id)
    return data.get("analytics_history", [])
