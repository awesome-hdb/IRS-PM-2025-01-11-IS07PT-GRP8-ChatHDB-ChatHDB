from flask import Blueprint, jsonify, request
from service import model, future_model

# Interact with prediction model
model_bp = Blueprint('model', __name__, url_prefix='/api/model')

# Create a new user
@model_bp.route("/", methods=["GET"])
def get_prediction():
    try:
        return jsonify(NotImplemented), 200
        
    except Exception as e:
        # Catch any exception and return an appropriate error response
        return jsonify({"error": str(e)}), 404
    
@model_bp.route("/predict/test", methods=["GET"])
def get_test_prediction():
    try:
        result = {
            "price": model.TestPredictPrice(),
        }
        return jsonify(result), 200
        
    except Exception as e:
        # Catch any exception and return an appropriate error response
        return jsonify({"error": str(e)}), 404
    
@model_bp.route("/predict", methods=["GET"])
def get_price_prediction():
    try:
        street_name = request.args.get('street_name', default="CLEMENTI AVE 1")
        floor_area = request.args.get('floor_area', default=70)
        storey_range = request.args.get('storey_range', default=1)
        lease_start = int(request.args.get('lease_start', default=2000))
        flat_type = request.args.get('flat_type', default="2 ROOM")
        result = {
            "price": model.PredictPrice(street_name=street_name, floor_area=floor_area, storey_range=storey_range, lease_start=lease_start, flat_type=flat_type),
        }
        return jsonify(result), 200
        
    except Exception as e:
        # Catch any exception and return an appropriate error response
        return jsonify({"error": str(e)}), 404
    
    
@model_bp.route("/future/predict", methods=["GET"])
def get_future_price_prediction():
    try:
        street_name = request.args.get('street_name', default="CLEMENTI AVE 1")
        floor_area = request.args.get('floor_area', default=70)
        storey_range = request.args.get('storey_range', default=1)
        lease_start = int(request.args.get('lease_start', default=2000))
        flat_type = request.args.get('flat_type', default="2 ROOM")
        result = future_model.PredictFuturePrice(street_name=street_name, floor_area=floor_area, storey_range=storey_range, lease_start=lease_start, flat_type=flat_type)
        
        return jsonify(result), 200
        
    except Exception as e:
        # Catch any exception and return an appropriate error response
        return jsonify({"error": str(e)}), 404
    
    
@model_bp.route("/future/predict/test", methods=["GET"])
def get_test_future_price_prediction():
    try:
        result = future_model.TestPredictFuturePrice()
        return jsonify(result), 200
        
    except Exception as e:
        # Catch any exception and return an appropriate error response
        return jsonify({"error": str(e)}), 404
    