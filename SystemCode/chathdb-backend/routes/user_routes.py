# from flask import Blueprint, request, jsonify
# from supabase import create_client, Client
# from config import SUPABASE_KEY, SUPABASE_URL

# # Handle user actions
# user_bp = Blueprint('user', __name__, url_prefix='/api/users')
# # Initialize Supabase client
# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# # Create a new user
# @user_bp.route("/", methods=["POST"])
# def create_user():
#     data = request.json
#     try:
#         response = supabase.table("users").insert(data).execute()

#         if not response.data:
#             return jsonify({"error": "Failed to create new user"}), 404
        
#         return jsonify(response.data), 201
        
#     except Exception as e:
#         # Catch any exception and return an appropriate error response
#         return jsonify({"error": str(e)}), 404


# # Get all users
# @user_bp.route("/", methods=["GET"])
# def get_users():
#     try:
#         response = supabase.table("users").select("*").execute()
#         return jsonify(response.data), 200
    
#     except Exception as e:
#         # Catch any exception and return an appropriate error response
#         return jsonify({"error": str(e)}), 404

# # Get a user by ID
# @user_bp.route("/<user_id>", methods=["GET"])
# def get_user(user_id):
#     try:
#         response = supabase.table("users").select("*").eq("id", user_id).execute()

#         if not response.data:
#             return jsonify({"error": "User not found"}), 404

#         return jsonify(response.data[0]), 200
    
#     except Exception as e:
#         # Catch any exception and return an appropriate error response
#         return jsonify({"error": str(e)}), 404

# # Update a user
# @user_bp.route("/<user_id>", methods=["PUT"])
# def update_user(user_id):
#     data = request.json
#     try:
#         response = supabase.table("users").update(data).eq("id", user_id).execute()

#         if not response.data:
#             return jsonify({"error": "Failed to update user"}), 404

#         return jsonify(response.data), 200
    
#     except Exception as e:
#         # Catch any exception and return an appropriate error response
#         return jsonify({"error": str(e)}), 404

# # Delete a user
# @user_bp.route("/<user_id>", methods=["DELETE"])
# def delete_user(user_id):
#     try:
#         response = supabase.table("users").delete().eq("id", user_id).execute()

#         if not response.data:
#             return jsonify({"error": "Failed to delete user"}), 404
        
#         return jsonify({"message": "User deleted"}), 200
        
#     except Exception as e:
#         # Catch any exception and return an appropriate error response
#         return jsonify({"error": str(e)}), 404



