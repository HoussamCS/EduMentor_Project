"""
AI Agent for Smart Recommendations
Triggered when a student is flagged as High Risk.
Combines ML predictions with LLM to generate personalized recommendations and quizzes.
"""

import os
import sys
import json
import logging

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import Config
from rag.prompts import (
    AGENT_SYSTEM_PROMPT, AGENT_USER_TEMPLATE,
    QUIZ_SYSTEM_PROMPT, QUIZ_USER_TEMPLATE
)

logger = logging.getLogger(__name__)


def call_llm(system_prompt: str, user_prompt: str) -> str:
    """
    Universal LLM caller supporting Anthropic or OpenAI.
    Returns the text response.
    """
    try:
        logger.info(f"call_llm invoked. Provider: {Config.LLM_PROVIDER}")
        logger.info(f"ANTHROPIC_API_KEY present: {bool(Config.ANTHROPIC_API_KEY)}")
        logger.info(f"OPENAI_API_KEY present: {bool(Config.OPENAI_API_KEY)}")
        logger.info(f"OPENAI_API_KEY value check: {Config.OPENAI_API_KEY != 'your_openai_api_key_here'}")
        
        if Config.LLM_PROVIDER == "anthropic" and Config.ANTHROPIC_API_KEY:
            logger.info("Using Anthropic")
            return _call_anthropic(system_prompt, user_prompt)
        elif Config.OPENAI_API_KEY and Config.OPENAI_API_KEY != "your_openai_api_key_here":
            logger.info("Using OpenAI")
            return _call_openai(system_prompt, user_prompt)
        else:
            logger.warning("No LLM API key configured. Returning fallback response.")
            return None
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        logger.exception("Full traceback:")
        return None


def _call_anthropic(system_prompt: str, user_prompt: str) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=600,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )
    return message.content[0].text


def _call_openai(system_prompt: str, user_prompt: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=Config.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        max_tokens=600
    )
    return response.choices[0].message.content


def _fallback_recommendations(student_profile: dict) -> dict:
    """Default recommendations when LLM is unavailable."""
    avg_score = float(student_profile.get("avg_score", 0))
    days_active = float(student_profile.get("days_active", 0))
    forum_posts = float(student_profile.get("forum_posts", 0))

    recommendations = []
    topics = []

    if avg_score < 0.5:
        recommendations.append({
            "title": "Python Fundamentals Review",
            "reason": "Low average score suggests gaps in foundational knowledge",
            "priority": "High"
        })
        topics.append("Python basics")

    if days_active < 20:
        recommendations.append({
            "title": "Study Habit Workshop",
            "reason": "Low active days indicate engagement issues",
            "priority": "High"
        })
        topics.append("study strategies")

    if forum_posts < 3:
        recommendations.append({
            "title": "Community Participation Guide",
            "reason": "Low forum engagement reduces peer learning opportunities",
            "priority": "Medium"
        })

    recommendations.append({
        "title": "Machine Learning Fundamentals",
        "reason": "Core curriculum review for stronger foundations",
        "priority": "Medium"
    })
    topics.append("machine learning")

    return {
        "recommendations": recommendations,
        "study_tips": [
            "Set a daily study schedule of at least 1-2 hours",
            "Use the Pomodoro technique: 25 min focus, 5 min break",
            "Engage with the community — post questions and help others"
        ],
        "encouragement": "You've taken the first step by being here. Every expert was once a beginner!",
        "topics_for_quiz": topics
    }


def _fallback_quiz(topics: list) -> dict:
    """Default quiz when LLM is unavailable."""
    return {
        "quiz_title": "Fundamentals Review Quiz",
        "questions": [
            {
                "question": "What is the purpose of the train_test_split function in scikit-learn?",
                "options": [
                    "A) To split text into tokens",
                    "B) To divide data into training and testing subsets",
                    "C) To split a neural network into layers",
                    "D) To partition a hard drive"
                ],
                "correct": "B",
                "explanation": "train_test_split divides your dataset so you can train on one part and evaluate on unseen data."
            },
            {
                "question": "What does a high loss value during training typically indicate?",
                "options": [
                    "A) The model is performing well",
                    "B) The model needs more data only",
                    "C) The model has large prediction errors",
                    "D) Training is complete"
                ],
                "correct": "C",
                "explanation": "Loss measures prediction error — high loss means the model is making large mistakes."
            },
            {
                "question": "Which Python library is most commonly used for data manipulation?",
                "options": [
                    "A) NumPy",
                    "B) Matplotlib",
                    "C) Pandas",
                    "D) Scikit-learn"
                ],
                "correct": "C",
                "explanation": "Pandas provides DataFrames for powerful, flexible data manipulation and analysis."
            }
        ]
    }


def generate_recommendations(student_profile: dict) -> dict:
    """
    Generate personalized recommendations for an at-risk student.
    
    Args:
        student_profile: dict with risk_score, risk_level, and activity metrics
    
    Returns:
        dict with recommendations, study_tips, encouragement
    """
    user_prompt = AGENT_USER_TEMPLATE.format(
        risk_score=student_profile.get("risk_score", 0.8),
        risk_level=student_profile.get("risk_level", "High Risk"),
        days_active=student_profile.get("days_active", 10),
        forum_posts=student_profile.get("forum_posts", 2),
        assignment_submissions=student_profile.get("assignment_submissions", 3),
        quiz_attempts=student_profile.get("quiz_attempts", 1),
        avg_score=student_profile.get("avg_score", 0.4)
    )

    response_text = call_llm(AGENT_SYSTEM_PROMPT, user_prompt)

    if response_text:
        try:
            # Strip any markdown fences
            clean = response_text.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            result = json.loads(clean.strip())
            result["topics_for_quiz"] = [
                r["title"] for r in result.get("recommendations", [])[:2]
            ]
            return result
        except json.JSONDecodeError:
            logger.warning("Could not parse LLM recommendation response as JSON")

    return _fallback_recommendations(student_profile)


def generate_remedial_quiz(topics: list) -> dict:
    """
    Generate a simple quiz for topics where the student needs help.
    
    Args:
        topics: list of topic names
    
    Returns:
        dict with quiz questions
    """
    if not topics:
        topics = ["Python fundamentals", "machine learning basics"]

    topic_str = ", ".join(topics[:3])
    user_prompt = QUIZ_USER_TEMPLATE.format(topics=topic_str)

    response_text = call_llm(QUIZ_SYSTEM_PROMPT, user_prompt)

    if response_text:
        try:
            clean = response_text.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            return json.loads(clean.strip())
        except json.JSONDecodeError:
            logger.warning("Could not parse LLM quiz response as JSON")

    return _fallback_quiz(topics)


def run_agent(student_profile: dict) -> dict:
    """
    Main agent entry point for high-risk students.
    Generates both recommendations and a remedial quiz.
    
    Args:
        student_profile: dict containing risk scores and activity metrics
    
    Returns:
        Complete agent response with recommendations + quiz
    """
    logger.info(f"Agent triggered for student — Risk: {student_profile.get('risk_level')}")

    # Step 1: Generate recommendations
    rec_result = generate_recommendations(student_profile)

    # Step 2: Generate remedial quiz based on weak topics
    topics = rec_result.get("topics_for_quiz", ["Python", "Machine Learning"])
    quiz = generate_remedial_quiz(topics)

    return {
        "recommendations": rec_result.get("recommendations", []),
        "study_tips": rec_result.get("study_tips", []),
        "encouragement": rec_result.get("encouragement", "Keep going — you can do this!"),
        "generated_quiz": quiz
    }
