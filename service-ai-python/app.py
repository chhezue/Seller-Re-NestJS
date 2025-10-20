from flask import Flask, request, jsonify
from flask_cors import CORS

from services.dummy_generator import generate_dummy_product

app = Flask(__name__)
CORS(app) # CORS 설정

@app.route('/generate-product-data', methods=['POST'])
def handle_dummy_data():
    data = request.json
    if not data or 'category' not in data:
        return jsonify({"error": "카테고리(category) 정보가 필요합니다."}), 400

    category = data.get('category')
    result = generate_dummy_product(category)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)