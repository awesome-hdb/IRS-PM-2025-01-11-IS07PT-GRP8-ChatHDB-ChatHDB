from flask import Flask
from flask_cors import CORS
import os
from routes import register_routes

app = Flask(__name__)
CORS(app)
    
register_routes(app)  # Register all route modules

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
