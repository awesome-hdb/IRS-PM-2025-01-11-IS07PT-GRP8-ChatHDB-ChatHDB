from .health_routes import health_bp
from .model_routes import model_bp

# Register all routers here
def register_routes(app):
    app.register_blueprint(health_bp)
    app.register_blueprint(model_bp)
