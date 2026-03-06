from flask import Flask
from flask_cors import CORS
from config import Config


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for React frontend
    CORS(app, origins=Config.CORS_ORIGINS.split(","))

    # Register blueprints
    from routes.chat import chat_bp
    from routes.exercise import exercise_bp
    from routes.analytics import analytics_bp
    from routes.auth import auth_bp
    from routes.user import user_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/user")
    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(exercise_bp, url_prefix="/api")
    app.register_blueprint(analytics_bp, url_prefix="/api")

    @app.route("/api/health")
    def health():
        return {"status": "ok", "message": "EduMentor AI backend is running"}

    return app


# Create app instance for gunicorn
app = create_app()

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", debug=Config.DEBUG, port=port)
