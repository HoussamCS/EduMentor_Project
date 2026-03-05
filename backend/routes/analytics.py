"""
Analytics Route — Risk Prediction & Agent Recommendations
POST /api/predict-risk
POST /api/predict-risk-single
"""

import logging
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/predict-risk", methods=["POST"])
def predict_risk():
    """
    Predict dropout risk from uploaded CSV.
    
    Request: multipart/form-data with file field "file"
    Optional: Authorization header for saving to user history
    
    Response:
        {
            "results": [
                {
                    "student_id": "1001",
                    "risk_score": 0.87,
                    "risk_level": "High Risk",
                    "recommendations": [...],  // if high risk
                    "generated_quiz": {...}     // if high risk
                }
            ]
        }
    """
    try:
        # Check if user is authenticated (optional)
        user_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            from routes.auth import verify_token
            result = verify_token(token)
            if result["success"]:
                user_id = result["payload"]["user_id"]
        
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded. Please upload a CSV file."}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not file.filename.endswith(".csv"):
            return jsonify({"error": "Only CSV files are supported"}), 400

        # Read CSV content
        csv_content = file.read()
        if len(csv_content) == 0:
            return jsonify({"error": "File is empty"}), 400

        # Get predictions
        from ml.predict import predict_from_csv
        predictions = predict_from_csv(csv_content)

        if not predictions:
            return jsonify({"error": "No valid student records found in CSV"}), 400

        # For high-risk students, trigger agent (limit to first 5 for performance)
        from ml.agent import run_agent, _fallback_recommendations, _fallback_quiz
        results = []
        high_risk_count = 0
        MAX_DETAILED_ANALYSIS = 5  # Only do full AI analysis for first 5 high-risk students

        for pred in predictions:
            result = {
                "student_id": pred["student_id"],
                "risk_score": pred["risk_score"],
                "risk_level": pred["risk_level"],
                "model_used": pred["model_used"]
            }

            if pred["risk_level"] == "High Risk":
                high_risk_count += 1
                try:
                    # Full AI analysis for first few students, fast fallback for rest
                    if high_risk_count <= MAX_DETAILED_ANALYSIS:
                        agent_response = run_agent(pred)
                    else:
                        # Use fast fallback for remaining students
                        fallback = _fallback_recommendations(pred)
                        agent_response = {
                            "recommendations": fallback["recommendations"],
                            "study_tips": fallback["study_tips"],
                            "encouragement": fallback["encouragement"],
                            "generated_quiz": _fallback_quiz(fallback.get("topics_for_quiz", []))
                        }
                    
                    result["recommendations"] = agent_response["recommendations"]
                    result["study_tips"] = agent_response["study_tips"]
                    result["encouragement"] = agent_response["encouragement"]
                    result["generated_quiz"] = agent_response["generated_quiz"]
                except Exception as e:
                    logger.error(f"Agent error for student {pred['student_id']}: {e}")
                    result["recommendations"] = []
                    result["generated_quiz"] = None

            results.append(result)

        response_data = {
            "results": results,
            "total": len(results),
            "high_risk_count": sum(1 for r in results if r["risk_level"] == "High Risk"),
            "medium_risk_count": sum(1 for r in results if r["risk_level"] == "Medium Risk"),
            "low_risk_count": sum(1 for r in results if r["risk_level"] == "Low Risk")
        }
        
        # Save to user history if authenticated
        if user_id:
            try:
                from models.user_data import save_analytics_result
                save_analytics_result(user_id, {
                    "filename": file.filename,
                    "total_students": len(results),
                    "high_risk_count": response_data["high_risk_count"],
                    "medium_risk_count": response_data["medium_risk_count"],
                    "low_risk_count": response_data["low_risk_count"]
                })
            except Exception as e:
                logger.warning(f"Failed to save analytics to user history: {e}")
        
        return jsonify(response_data)

    except Exception as e:
        logger.exception(f"Prediction error: {e}")
        return jsonify({"error": "Prediction failed", "details": str(e)}), 500


@analytics_bp.route("/predict-risk-single", methods=["POST"])
def predict_risk_single():
    """
    Predict risk for a single student (JSON body).
    
    Request body: student data as JSON
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body required"}), 400

        from ml.predict import predict_single
        prediction = predict_single(data)

        result = {
            "risk_score": prediction["risk_score"],
            "risk_level": prediction["risk_level"],
            "model_used": prediction["model_used"]
        }

        # Trigger agent if high risk
        if prediction["risk_level"] == "High Risk":
            from ml.agent import run_agent
            profile = {**data, **prediction}
            agent_response = run_agent(profile)
            result["recommendations"] = agent_response["recommendations"]
            result["study_tips"] = agent_response["study_tips"]
            result["encouragement"] = agent_response["encouragement"]
            result["generated_quiz"] = agent_response["generated_quiz"]

        return jsonify(result)

    except Exception as e:
        logger.exception(f"Single prediction error: {e}")
        return jsonify({"error": str(e)}), 500


@analytics_bp.route("/model-info", methods=["GET"])
def model_info():
    """Return information about the loaded ML model."""
    try:
        import os
        from config import Config
        model_exists = os.path.exists(Config.MODEL_PATH)
        return jsonify({
            "model_path": Config.MODEL_PATH,
            "model_loaded": model_exists,
            "status": "ready" if model_exists else "using heuristic fallback"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
