from flask import Blueprint, jsonify

# Perform health checks on system
health_bp = Blueprint('health', __name__, url_prefix='/api/health')

@health_bp.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "Backend is running!"})
