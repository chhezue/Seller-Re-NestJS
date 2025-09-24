import os
import json
import re
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------
# 설정 (Configuration)
# ---------------------------------
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

UNSPLASH_ACCESS_KEY = os.environ.get('UNSPLASH_ACCESS_KEY')
UNSPLASH_API_URL = "https://api.unsplash.com/search/photos"

# Flask 앱 초기화
app = Flask(__name__)
CORS(app)

# ---------------------------------
# 유틸 함수 (Utility Functions)
# ---------------------------------
def clean_text(text: str, max_sentences: int = 1) -> str:
    """간단한 텍스트 후처리: 줄바꿈 제거 및 문장 수 제한"""
    text = re.sub(r"\s+", " ", text).strip()
    sentences = re.split(r'(?<=[.!?])\s+', text)
    limited_sentences = sentences[:max_sentences]
    result = " ".join(limited_sentences).strip()
    if result and result[-1] not in ".!?":
        result += "."
    return result

# ---------------------------------
# 핵심 로직 (Core Logic)
# ---------------------------------
def generate_creative_text(category: str):
    """카테고리를 기반으로 제품명과 설명을 생성 (Groq API 활용)."""

    category_examples = {
        "티켓/교환권": "에버랜드 자유이용권, CGV 영화관람권, 스파랜드 입욕권",
        "디지털기기": "아이폰 14 프로, 갤럭시 S23, 아이패드 에어, 맥북 프로",
        "생활가전": "삼성 세탁기, LG 냉장고, 다이슨 청소기, 쿠쿠 전기밥솥",
        "가구/인테리어": "이케아 침대, 한샘 소파, 일룸 책상, 까사미아 서랍장",
        "여성의류": "자라 코트, 유니클로 패딩, H&M 원피스, 나이키 운동복",
        "여성잡화": "샤넬 가방, 루이비통 지갑, 에르메스 스카프, 애플워치 밴드",
        "남성패션/잡화": "나이키 운동화, 아디다스 후디, 리바이스 청바지, 몽블랑 지갑",
        "스포츠/레저": "윌슨 테니스 라켓, 나이키 축구화, 던롭 골프백, 스노우피크 텐트",
        "취미/게임/음반": "닌텐도 스위치, PS5 콘솔, BTS 앨범, 레고 세트",
        "도서": "해리포터 전집, 데미안, 코스모스, 미움받을 용기",
        "뷰티/미용": "다이슨 헤어드라이어, 샤넬 향수, 랑콤 화장품, 필립스 면도기",
        "유아동": "레고 듀플로, 실바니아 하우스, 타요 장난감, 뽀로로 인형",
        "유아도서": "백희나 그림책, 어스본 코리아, 블루래빗 전집, 앤서니 브라운 동화책",
        "생활/주방": "스타우브 냄비, 테팔 후라이팬, 락앤락 보관용기, 브리타 정수기",
        "식물": "몬스테라, 산세베리아, 고무나무, 다육식물",
        "가공식품": "스팸, 햇반, 비비고 만두, 올리브오일",
        "건강기능식품": "정관장 홍삼, 종근당 락토핏, 고려은단 비타민C, 센트룸 멀티비타민",
        "반려동물용품": "로얄캐닌 사료, 캣타워, 하림펫푸드 간식, 넬로 펫드라이룸",
        "기타 중고물품": "샘소나이트 캐리어, 몽블랑 만년필, 파버카스텔 색연필"
    }
    examples_text = category_examples.get(category, f"{category} 관련 상품들")

    prompt = f"""
[역할] 당신은 한국 중고거래 앱에 올릴 현실적인 더미 데이터를 생성하는 AI입니다.
[목표] 주어진 카테고리에 맞는, 실제 사용자가 작성한 듯한 자연스러운 상품명과 설명을 생성합니다.

[카테고리]: {category}
[참고 예시]: {examples_text}

[중요 지침]
- 위 예시를 참고하여, 해당 카테고리에 맞는 **다른** 구체적인 상품을 하나 창작하세요.
- 실제 존재하는 브랜드와 모델명을 사용하되, 예시와 겹치지 않게 만드세요.
- 설명은 상태, 구성품, 사용감, 판매 이유 등을 자연스럽게 포함하여 3~4문장으로 작성하세요.

[출력 형식]
반드시 아래 형식에 맞는 유효한 JSON 객체만 응답해야 합니다. 다른 설명은 절대 추가하지 마세요.
{{
  "title": "브랜드와 모델명이 포함된 구체적인 상품명 (25자 이내)",
  "description": "실제 중고거래처럼 자연스러운 문체로 작성된 상품 설명 (3~4문장)"
}}
"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 300,
        "temperature": 0.8,
        "top_p": 0.9,
    }

    try:
        print(f"🤖 [Groq] '{category}' 데이터 생성 요청...")
        response = requests.post(GROQ_API_URL, headers=headers, json=body, timeout=20)
        response.raise_for_status()
        result = response.json()

        content = result["choices"][0]["message"]["content"].strip()
        print(f"✅ [Groq] 응답 수신 완료.")

        json_match = re.search(r'\{[\s\S]*\}', content)

        if not json_match:
            print(f"❌ [Groq] 응답에서 JSON 객체를 찾지 못했습니다. Content: {content}")
            return "모델 응답 오류", "AI가 유효한 형식의 응답을 생성하지 못했습니다."

        json_string = json_match.group(0)

        try:
            parsed = json.loads(json_string)
            title = parsed.get("title", f"멋진 {category} 상품")
            description = parsed.get("description", f"품질 좋은 {category}입니다.")
            print(f"✅ [Groq] JSON 파싱 성공 - 제품: {title}")

            title = clean_text(title, max_sentences=1)
            description = clean_text(description, max_sentences=4)

            return title, description

        except json.JSONDecodeError as je:
            print(f"❌ [Groq] JSON 파싱 실패: {je}")
            print(f"   파싱 시도 문자열: {json_string}")
            return "JSON 파싱 실패", "AI가 생성한 데이터의 형식이 잘못되었습니다."

    except requests.exceptions.RequestException as e:
        print(f"❌ [Groq] API 호출 실패: {e}")
        return "API 호출 실패", "AI 서버에 연결하는 중 문제가 발생했습니다."


def search_images(title: str, category: str):
    """Unsplash에서 상품명과 카테고리를 이용해 관련 이미지를 단계별로 검색합니다."""

    KOR_TO_ENG_CATEGORY = {
        "티켓/교환권": "ticket voucher", "디지털기기": "digital device", "생활가전": "home appliance",
        "가구/인테리어": "furniture interior", "여성의류": "women's clothing", "여성잡화": "women's accessories",
        "남성패션/잡화": "men's fashion", "스포츠/레저": "sports leisure", "취미/게임/음반": "hobby game music",
        "도서": "books", "뷰티/미용": "beauty cosmetics", "유아동": "kids items",
        "유아도서": "children's book", "생활/주방": "kitchenware", "식물": "plant",
        "가공식품": "processed food", "건강기능식품": "health supplement", "반려동물용품": "pet supplies",
        "기타 중고물품": "used goods"
    }
    english_category = KOR_TO_ENG_CATEGORY.get(category, "product")

    # 1. AI가 생성한 제목으로 먼저 검색 -> 2. 실패 시 영어 카테고리명으로 검색
    search_queries = [
        f"product shot of {title}",
        english_category
    ]

    for query in search_queries:
        params = {
            'query': query,
            'per_page': 3,
            'client_id': UNSPLASH_ACCESS_KEY,
            'orientation': 'squarish'
        }
        try:
            print(f"🔎 Unsplash에서 '{query}'(으)로 이미지 검색 중...")
            response = requests.get(UNSPLASH_API_URL, params=params, timeout=10)

            limit = response.headers.get('X-Ratelimit-Limit')
            remaining = response.headers.get('X-Ratelimit-Remaining')
            if limit and remaining:
                print(f"   (Unsplash API 사용량: {remaining}/{limit} 남음)")

            response.raise_for_status()
            data = response.json()
            if data.get('results'):
                print(f"✅ Unsplash 이미지 검색 성공.")
                return [result['urls']['small'] for result in data['results']]
            else:
                print(f"⚠️ 이미지를 찾지 못했습니다. 다음 검색어로 시도합니다.")
        except requests.exceptions.RequestException as e:
            print(f"❌ Unsplash API 오류: {e}. 다음 검색어로 시도합니다.")
            continue

    # 모든 검색 실패 시 기본 이미지 반환
    print("⚠️ 모든 Unsplash 검색에 실패하여 기본 이미지를 반환합니다.")
    return [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'
    ]

# ---------------------------------
# API 엔드포인트 (API Endpoint)
# ---------------------------------
@app.route('/generate-product-data', methods=['POST'])
def generate_product_data():
    data = request.get_json()
    if not data or 'category' not in data:
        return jsonify({"error": "카테고리(category) 정보가 필요합니다."}), 400

    category = data['category']

    title, description = generate_creative_text(category)

    # AI 생성 실패 시 title 대신 category를 검색어로 사용
    search_title = title if "실패" not in title else category
    image_urls = search_images(title=search_title, category=category)

    response_data = {
        "name": title,
        "description": description,
        "imageUrls": image_urls
    }
    return jsonify(response_data)

# ---------------------------------
# 서버 실행 (Run Server)
# ---------------------------------
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
