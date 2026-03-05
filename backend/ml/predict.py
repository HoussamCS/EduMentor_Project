"""
Dropout Risk Prediction Module
Loads the trained model and makes predictions on student data.
"""

import os
import sys
import logging
import io
import numpy as np
import pandas as pd
import joblib

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import Config

logger = logging.getLogger(__name__)

# Feature columns expected by the model (must match training)
FEATURE_COLUMNS = [
    "age",
    "gender_encoded",
    "edu_level_encoded",
    "num_prev_attempts",
    "studied_credits",
    "disability_encoded",
    "region_encoded",
    "avg_score",
    "days_active",
    "forum_posts",
    "resource_clicks",
    "assignment_submissions",
    "video_views",
    "quiz_attempts"
]

# Column mappings for encoding
GENDER_MAP = {"M": 1, "F": 0, "Male": 1, "Female": 0}
EDUCATION_MAP = {
    "Lower Than A Level": 0,
    "A Level or Equivalent": 1,
    "HE Qualification": 2,
    "Post Graduate Qualification": 3
}
DISABILITY_MAP = {"Y": 1, "N": 0, "Yes": 1, "No": 0}
REGION_MAP = {
    "South Region": 0, "North Region": 1,
    "East Region": 2, "West Region": 3,
    "London Region": 4, "Scotland": 5, "Ireland": 6, "Wales": 7
}

_model = None


def load_model():
    """Load the trained model (cached after first load)."""
    global _model
    if _model is None:
        model_path = Config.MODEL_PATH
        if not os.path.exists(model_path):
            logger.warning(f"Model not found at {model_path}. Using fallback heuristic.")
            return None
        _model = joblib.load(model_path)
        logger.info(f"Model loaded from {model_path}")
    return _model


def encode_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Encode categorical variables and ensure all required feature columns exist.
    Handles both raw (string) and pre-encoded (numeric) columns.
    """
    df = df.copy()

    # Encode gender
    if "gender" in df.columns and "gender_encoded" not in df.columns:
        df["gender_encoded"] = df["gender"].map(GENDER_MAP).fillna(0).astype(int)
    elif "gender_encoded" not in df.columns:
        df["gender_encoded"] = 0

    # Encode education
    if "education_level" in df.columns and "edu_level_encoded" not in df.columns:
        df["edu_level_encoded"] = df["education_level"].map(EDUCATION_MAP).fillna(1).astype(int)
    elif "edu_level_encoded" not in df.columns:
        df["edu_level_encoded"] = 1

    # Encode disability
    if "disability" in df.columns and "disability_encoded" not in df.columns:
        df["disability_encoded"] = df["disability"].map(DISABILITY_MAP).fillna(0).astype(int)
    elif "disability_encoded" not in df.columns:
        df["disability_encoded"] = 0

    # Encode region
    if "region" in df.columns and "region_encoded" not in df.columns:
        df["region_encoded"] = df["region"].map(REGION_MAP).fillna(0).astype(int)
    elif "region_encoded" not in df.columns:
        df["region_encoded"] = 0

    # Normalize avg_score if > 1 (percentage → decimal)
    if "avg_score" in df.columns:
        if df["avg_score"].max() > 1.0:
            df["avg_score"] = df["avg_score"] / 100.0

    return df


def heuristic_risk_score(row: dict) -> float:
    """
    Fallback heuristic when model is not available.
    Lower engagement = higher risk.
    """
    score = 0.0
    days_active = float(row.get("days_active", 30))
    avg_score = float(row.get("avg_score", 0.5))
    forum_posts = float(row.get("forum_posts", 5))
    assignments = float(row.get("assignment_submissions", 5))

    # Normalize (max expected values)
    score += (1 - min(days_active / 65.0, 1.0)) * 0.35
    score += (1 - min(avg_score if avg_score <= 1 else avg_score / 100.0, 1.0)) * 0.35
    score += (1 - min(forum_posts / 23.0, 1.0)) * 0.15
    score += (1 - min(assignments / 11.0, 1.0)) * 0.15

    return round(score, 4)


def classify_risk(risk_score: float) -> str:
    """Convert numeric risk score to human-readable level."""
    if risk_score >= 0.65:
        return "High Risk"
    elif risk_score >= 0.35:
        return "Medium Risk"
    else:
        return "Low Risk"


def predict_single(student_data: dict) -> dict:
    """
    Predict risk for a single student.
    
    Args:
        student_data: dict with student features
    
    Returns:
        {"risk_score": float, "risk_level": str}
    """
    model = load_model()

    if model is None:
        risk_score = heuristic_risk_score(student_data)
        return {
            "risk_score": risk_score,
            "risk_level": classify_risk(risk_score),
            "model_used": "heuristic"
        }

    # Build DataFrame from single row
    df = pd.DataFrame([student_data])
    df = encode_dataframe(df)

    # Select features
    available_cols = [c for c in FEATURE_COLUMNS if c in df.columns]
    missing_cols = [c for c in FEATURE_COLUMNS if c not in df.columns]

    # Fill missing with median/0
    for col in missing_cols:
        df[col] = 0

    X = df[FEATURE_COLUMNS].values

    # Predict probability
    try:
        prob = model.predict_proba(X)[0]
        # Probability of class 1 (at risk)
        risk_score = float(prob[1]) if len(prob) > 1 else float(prob[0])
    except Exception:
        prediction = model.predict(X)[0]
        risk_score = float(prediction)

    return {
        "risk_score": round(risk_score, 4),
        "risk_level": classify_risk(risk_score),
        "model_used": "ml_model"
    }


def predict_from_csv(csv_content: bytes) -> list[dict]:
    """
    Predict risk for multiple students from CSV content.
    
    Args:
        csv_content: raw bytes of CSV file
    
    Returns:
        List of prediction results per student
    """
    df = pd.read_csv(io.BytesIO(csv_content))
    df = encode_dataframe(df)

    model = load_model()
    results = []

    for idx, row in df.iterrows():
        student_id = str(row.get("student_id", idx))

        if model is None:
            risk_score = heuristic_risk_score(row.to_dict())
            model_used = "heuristic"
        else:
            available_cols = [c for c in FEATURE_COLUMNS if c in df.columns]
            row_data = {col: row.get(col, 0) for col in FEATURE_COLUMNS}
            X = np.array([[row_data[c] for c in FEATURE_COLUMNS]])

            try:
                prob = model.predict_proba(X)[0]
                risk_score = float(prob[1]) if len(prob) > 1 else float(prob[0])
            except Exception:
                risk_score = heuristic_risk_score(row.to_dict())

            model_used = "ml_model"

        results.append({
            "student_id": student_id,
            "risk_score": round(risk_score, 4),
            "risk_level": classify_risk(risk_score),
            "model_used": model_used,
            "days_active": float(row.get("days_active", 0)),
            "avg_score": float(row.get("avg_score", 0)),
            "forum_posts": float(row.get("forum_posts", 0)),
            "assignment_submissions": float(row.get("assignment_submissions", 0)),
            "quiz_attempts": float(row.get("quiz_attempts", 0))
        })

    return results
