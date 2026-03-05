"""
Exercise Generator Route
POST /api/generate-exercise
POST /api/grade
"""

import logging
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

exercise_bp = Blueprint("exercise", __name__)

VALID_TOPICS = [
    "Python Basics",
    "Pandas & Data Manipulation",
    "NumPy Arrays",
    "Data Visualization",
    "Scikit-learn Basics",
    "Logistic Regression",
    "Random Forest",
    "Neural Networks",
    "NLP & Text Processing",
    "Large Language Models",
    "RAG Systems",
    "Model Evaluation",
    "Feature Engineering",
    "Cross-Validation",
    "Hyperparameter Tuning"
]

VALID_DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"]


@exercise_bp.route("/generate-exercise", methods=["POST"])
def generate_exercise():
    """
    Generate a coding exercise using LLM.
    
    Request body:
        {
            "topic": "Python Basics",
            "difficulty": "Beginner"
        }
    
    Response:
        {
            "exercise": {
                "problem": "...",
                "hints": ["..."],
                "solution": "..."
            }
        }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body required"}), 400

        topic = data.get("topic", "Python Basics").strip()
        difficulty = data.get("difficulty", "Beginner").strip()

        # Validate inputs
        if not topic:
            return jsonify({"error": "Topic is required"}), 400
        if difficulty not in VALID_DIFFICULTIES:
            difficulty = "Beginner"

        # Build prompt
        from rag.prompts import EXERCISE_SYSTEM_PROMPT, EXERCISE_USER_TEMPLATE
        from ml.agent import call_llm

        user_prompt = EXERCISE_USER_TEMPLATE.format(
            difficulty=difficulty,
            topic=topic
        )

        response = call_llm(EXERCISE_SYSTEM_PROMPT, user_prompt)

        if response is None:
            # Return a fallback exercise
            response = _fallback_exercise(topic, difficulty)
            return jsonify({"exercise": response, "raw": None})

        return jsonify({
            "exercise": {"raw": response},
            "topic": topic,
            "difficulty": difficulty
        })

    except Exception as e:
        logger.exception(f"Exercise generation error: {e}")
        return jsonify({"error": "Failed to generate exercise", "details": str(e)}), 500


@exercise_bp.route("/grade", methods=["POST"])
def grade():
    """
    Auto-grade a student's solution.
    
    Request body:
        {
            "problem": "...",
            "student_solution": "..."
        }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body required"}), 400

        problem = data.get("problem", "").strip()
        solution = data.get("student_solution", "").strip()

        if not problem or not solution:
            return jsonify({"error": "Both 'problem' and 'student_solution' are required"}), 400

        from rag.prompts import GRADER_SYSTEM_PROMPT, GRADER_USER_TEMPLATE
        from ml.agent import call_llm

        user_prompt = GRADER_USER_TEMPLATE.format(
            problem=problem,
            student_solution=solution
        )

        response = call_llm(GRADER_SYSTEM_PROMPT, user_prompt)

        if response is None:
            response = (
                "**Grade:** B\n**Score:** 75\n\n"
                "**Overall Feedback:**\nLLM not configured — manual grading required. "
                "Your solution has been recorded."
            )

        return jsonify({"feedback": response})

    except Exception as e:
        logger.exception(f"Grading error: {e}")
        return jsonify({"error": "Failed to grade solution", "details": str(e)}), 500


@exercise_bp.route("/topics", methods=["GET"])
def get_topics():
    """Return available topics."""
    return jsonify({"topics": VALID_TOPICS, "difficulties": VALID_DIFFICULTIES})


def _fallback_exercise(topic: str, difficulty: str) -> dict:
    """Return a default exercise when LLM is unavailable."""
    return {
        "raw": f"""**Problem:**
Write a Python function that demonstrates a key concept from {topic} at {difficulty} level.

**Requirements:**
- Function must be well-documented
- Include at least one example usage
- Handle edge cases appropriately

**Hints:**
1. Start by defining what inputs and outputs your function needs
2. Consider using built-in Python functions where appropriate
3. Test with both normal and edge-case inputs

**Expected Output:**
A working Python function with examples and edge case handling.

**Solution:**
```python
# Example solution for {topic} ({difficulty})
def example_solution(data):
    \"\"\"
    Demonstrates {topic} concept.
    Args:
        data: Input data to process
    Returns:
        Processed result
    \"\"\"
    # Your implementation here
    if not data:
        return None
    return data

# Test the function
result = example_solution([1, 2, 3])
print(f"Result: {{result}}")
```

**Explanation:**
This template demonstrates the basic structure for a {topic} exercise. 
Configure your LLM API key to get fully generated exercises."""
    }
