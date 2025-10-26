"""
LLM 기반 상품 설명 생성 서비스

GROQ API를 사용하여 상품 설명을 자동으로 생성합니다.
"""

import os
import logging
import requests
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

# 로거 설정
logger = logging.getLogger(__name__)

# GROQ API 설정
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class LLMService:
    """LLM을 사용한 상품 설명 생성 서비스"""
    
    # 영어 카테고리 → 한글 변환 매핑 (간소화 버전)
    CATEGORY_KOREAN_MAP = {
        "camera": "카메라",
        "book": "책",
        "washing machine": "세탁기",
        "shoe": "신발",
        "shoes": "신발",
        "boot": "부츠",
        "boots": "부츠",
        "sneakers": "운동화",
        "sandals": "샌들",
        "phone": "휴대폰",
        "smartphone": "스마트폰",
        "computer": "컴퓨터",
        "laptop": "노트북",
        "tablet": "태블릿",
        "monitor": "모니터",
        "keyboard": "키보드",
        "mouse": "마우스",
        "furniture": "가구",
        "chair": "의자",
        "table": "테이블",
        "desk": "책상",
        "sofa": "소파",
        "bed": "침대",
        "clothing": "의류",
        "dress": "원피스",
        "shirt": "셔츠",
        "pants": "바지",
        "bag": "가방",
        "backpack": "백팩",
        "wallet": "지갑",
        "watch": "시계",
        "_unlabeled": "미분류",
        "person": "사람",
        "eraser": "지우개",
    }
    
    @staticmethod
    def _translate_to_korean(category: str) -> str:
        """영어 카테고리를 한글로 변환합니다."""
        category_lower = category.lower().strip()
        return LLMService.CATEGORY_KOREAN_MAP.get(category_lower, category)

    @staticmethod
    def _call_groq_api(prompt: str, model: str = "llama-3.3-70b-versatile") -> str:
        """
        GROQ API를 호출하여 LLM 응답을 받습니다.

        Args:
            prompt (str): LLM에 전달할 프롬프트
            model (str): 사용할 모델 이름 (기본값: llama-3.3-70b-versatile)

        Returns:
            str: LLM이 생성한 응답 텍스트

        Raises:
            ValueError: API 키가 설정되지 않은 경우
            requests.HTTPError: API 호출 실패 시
        """
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY 환경 변수가 설정되지 않았습니다.")

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "당신은 중고 거래 플랫폼의 상품 설명을 작성하는 전문가입니다. "
                               "간결하고 매력적인 상품 설명을 작성합니다."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 500,
        }

        try:
            response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()
        
        except requests.exceptions.RequestException as e:
            logger.error(f"GROQ API 호출 오류: {e}")
            raise

    @staticmethod
    def generate_description_with_ai_keywords(
        user_name: str,
        category_name: str,
        condition: str,
        ai_keywords: list[str]
    ) -> str:
        """
        AI 키워드를 활용하여 풍부한 상품 설명을 생성합니다.
        
        사용 시나리오: AI 분석 결과와 사용자 데이터가 일치할 때
        
        Args:
            user_name (str): 사용자가 입력한 상품명
            category_name (str): 카테고리명
            condition (str): 상품 상태
            ai_keywords (list[str]): AI가 분석한 키워드 리스트
            
        Returns:
            str: 생성된 상품 설명
        """
        ai_keywords_str = ", ".join(ai_keywords)
        
        # 상품 상태를 한글로 변환
        condition_map = {
            "NEW": "새 상품",
            "LIKE_NEW": "거의 새것",
            "USED": "사용감 있음",
            "FOR_PARTS": "사용감 많음"
        }
        condition_kr = condition_map.get(condition, condition)
        
        prompt = f"""
당신은 중고 거래 플랫폼의 상품 설명 작성 전문가입니다.
다음 정보를 바탕으로 판매자가 올린 상품에 대한 매력적이고 상세한 설명을 작성해주세요.

**중요: 반드시 순수 한국어로만 작성하세요. 영어, 일본어, 중국어 등 다른 언어를 절대 사용하지 마세요.**

[상품 정보]
- 상품명: {user_name}
- 카테고리: {category_name}
- 상태: {condition_kr}
- AI 이미지 분석 결과: {ai_keywords_str}

[작성 가이드라인]
1. 상품명을 그대로 활용하여 시작하세요 (예: "{user_name}입니다.")
2. 4-6문장으로 구성하되, 총 150-250자 내외로 작성
3. AI 이미지 분석 키워드를 바탕으로 상품의 특징을 구체적으로 설명
4. 상품 상태({condition_kr})에 따른 세부 상태 묘사 (스크래치, 오염, 변색 등)
5. 해당 상품의 활용도나 장점을 구매자 관점에서 설명
6. 구매자가 궁금해할 만한 실용적 정보 추가 (예: 기능, 사이즈, 호환성 등)
7. 존댓말 사용하되 자연스럽고 친근한 톤 유지
8. 과장하지 않되 긍정적인 표현으로 작성

[상태별 설명 가이드]
- "새 상품": 미개봉, 새 제품, 완벽한 상태 강조
- "거의 새것": 사용 횟수 적음, 외관 깨끗, 작동 완벽 강조
- "사용감 있음": 사용 흔적 솔직히 표현, 기능 정상 여부 명시
- "사용감 많음": 구체적인 손상 부위 언급, 작동 가능 여부 명시

[금지 사항]
- 가격 언급 금지
- 거래 방법이나 위치 언급 금지
- 존재하지 않는 정보 추측 금지
- 브랜드나 모델명을 임의로 변경하지 말 것
- "문의주세요", "연락주세요" 같은 행동 유도 금지
- 너무 짧거나 성의 없는 설명 금지
- **영어, 일본어, 중국어 등 다른 언어 사용 절대 금지 - 오직 한국어로만 작성**
- 한국어가 아닌 단어나 표현 사용 금지 (예: sole → 밑창, サイズ → 사이즈)

[예시]
상품명이 "캐논 EOS M50 미러리스 카메라"이고 상태가 "사용감 있음"이면:
"캐논 EOS M50 미러리스 카메라입니다. 2년 정도 취미로 사용한 제품으로, 렌즈 마운트와 그립 부분에 약간의 사용감이 있지만 기능상 전혀 문제없습니다. 센서와 LCD 화면은 깨끗하며, 동영상과 사진 촬영 모두 정상 작동합니다. 가볍고 휴대성이 좋아 일상 촬영용으로 적합하며, 입문자나 서브 카메라로 추천드립니다. 배터리, 충전기, 스트랩 포함입니다."

반드시 순수 한국어로만 상품 설명을 출력하세요:
"""
        
        logger.info(f"AI 키워드 활용 설명 생성 중: {user_name}")
        return LLMService._call_groq_api(prompt)

    @staticmethod
    def generate_description_user_only(
        user_name: str,
        category_name: str,
        condition: str
    ) -> str:
        """
        사용자 데이터만을 사용하여 상품 설명을 생성합니다.
        
        사용 시나리오:
        - AI 신뢰도가 낮을 때 (<=0.5)
        - AI 분석 결과와 사용자 데이터가 불일치할 때
        
        Args:
            user_name (str): 사용자가 입력한 상품명
            category_name (str): 카테고리명
            condition (str): 상품 상태
            
        Returns:
            str: 생성된 상품 설명
        """
        # 상품 상태를 한글로 변환
        condition_map = {
            "NEW": "새 상품",
            "LIKE_NEW": "거의 새것",
            "USED": "사용감 있음",
            "FOR_PARTS": "사용감 많음"
        }
        condition_kr = condition_map.get(condition, condition)
        
        prompt = f"""
당신은 중고 거래 플랫폼의 상품 설명 작성 전문가입니다.
다음 정보만을 바탕으로 정확하고 신뢰할 수 있는 상품 설명을 작성해주세요.

**중요: 반드시 순수 한국어로만 작성하세요. 영어, 일본어, 중국어 등 다른 언어를 절대 사용하지 마세요.**

[상품 정보]
- 상품명: {user_name}
- 카테고리: {category_name}
- 상태: {condition_kr}

[작성 가이드라인]
1. 상품명을 그대로 활용하여 시작하세요 (예: "{user_name}입니다.")
2. 3-5문장으로 구성하되, 총 120-200자 내외로 작성
3. 상품 상태({condition_kr})에 따른 구체적인 상태 설명 포함
4. 카테고리({category_name})에 맞는 일반적인 특징과 활용도 설명
5. 구매자가 실제로 알고 싶어할 실용적인 정보 제공
6. 상태에 따른 솔직한 상태 묘사 (사용감 있다면 그대로 표현)
7. 존댓말 사용하되 친근하고 신뢰감 있는 톤 유지
8. 사실적이고 객관적으로 작성

[상태별 설명 가이드]
- "새 상품": 미개봉 또는 미사용, 완벽한 상태 강조
- "거의 새것": 사용 횟수 적음, 깨끗한 상태 강조
- "사용감 있음": 사용 흔적 솔직히 표현, 기능 정상 여부 명시
- "사용감 많음": 구체적인 사용감 위치 언급, 작동 가능 여부 명시

[금지 사항]
- 가격 언급 금지
- 거래 방법이나 위치 언급 금지
- 확인되지 않은 사양이나 스펙 추측 금지
- 상품명에 없는 브랜드나 모델명 추가 금지
- 과도한 감정 표현이나 과장 금지
- "문의주세요", "연락주세요" 같은 행동 유도 금지
- "완벽", "최고급", "새것과 동일" 같은 과장된 표현 금지
- 너무 짧거나 성의 없는 설명 금지
- **영어, 일본어, 중국어 등 다른 언어 사용 절대 금지 - 오직 한국어로만 작성**
- 한국어가 아닌 단어나 표현 사용 금지 (예: sole → 밑창, サイズ → 사이즈)

[예시]
상품명: "LG 트롬 세탁기", 상태: "사용감 있음", 카테고리: "생활가전"
출력: "LG 트롬 세탁기입니다. 3년 정도 사용한 제품으로 외관에 약간의 사용감이 있지만 세탁과 탈수 기능은 정상 작동합니다. 소음도 크지 않고 세탁 성능도 양호합니다. 이사로 인해 판매하게 되었으며, 실사용에 전혀 문제없는 제품입니다."

상품명: "원목 책상", 상태: "거의 새것", 카테고리: "가구/인테리어"
출력: "원목 책상입니다. 구매 후 몇 개월 사용하지 않아 거의 새것과 같은 상태입니다. 표면에 스크래치나 얼룩 없이 깨끗하며, 튼튼한 원목 소재로 오래 사용하실 수 있습니다. 크기가 적당해 서재나 방에서 사용하기 좋습니다."

반드시 순수 한국어로만 상품 설명을 출력하세요:
"""
        
        logger.info(f"사용자 데이터 전용 설명 생성 중: {user_name}")
        return LLMService._call_groq_api(prompt)

    @staticmethod
    def generate_warning_high_confidence(
        ai_category: str,
        user_category: str,
        confidence: float,
        ai_item_names: list[str] = None
    ) -> str:
        """
        신뢰도가 높을 때 (>0.7) 강력한 경고 메시지를 생성합니다.
        
        Args:
            ai_category (str): AI가 인식한 카테고리
            user_category (str): 사용자가 선택한 카테고리
            confidence (float): AI 신뢰도 (0.0 ~ 1.0)
            ai_item_names (list[str], optional): AI가 인식한 아이템명 리스트
            
        Returns:
            str: 경고 메시지
        """
        confidence_percent = int(confidence * 100)
        
        # 영어 카테고리를 한글로 변환
        ai_category_kr = LLMService._translate_to_korean(ai_category)
        
        base_message = (
            f"⚠️ 업로드하신 이미지를 분석한 결과, {confidence_percent}%의 신뢰도로 '{ai_category_kr}' 카테고리로 보입니다. "
            f"현재 '{user_category}' 카테고리로 등록하셨는데, 혹시 카테고리 선택이 잘못된 건 아닌지 확인해 주시겠어요? "
            f"정확한 카테고리 설정이 구매자 검색과 판매에 큰 도움이 됩니다."
        )
        
        return base_message

    @staticmethod
    def generate_warning_medium_confidence(
        ai_category: str,
        user_category: str,
        confidence: float,
        ai_item_names: list[str] = None
    ) -> str:
        """
        신뢰도가 중간일 때 (0.3~0.7) 부드러운 경고 메시지를 생성합니다.
        
        Args:
            ai_category (str): AI가 인식한 카테고리
            user_category (str): 사용자가 선택한 카테고리
            confidence (float): AI 신뢰도 (0.0 ~ 1.0)
            ai_item_names (list[str], optional): AI가 인식한 아이템명 리스트
            
        Returns:
            str: 경고 메시지
        """
        confidence_percent = int(confidence * 100)
        
        # 영어 카테고리를 한글로 변환
        ai_category_kr = LLMService._translate_to_korean(ai_category)
        
        base_message = (
            f"💡 업로드하신 이미지가 '{ai_category_kr}'로 보이네요 (AI 신뢰도 {confidence_percent}%). "
            f"현재 '{user_category}' 카테고리로 선택하셨는데, 혹시 한 번 더 확인해 주실 수 있나요? "
            f"카테고리가 맞다면 그대로 진행하셔도 괜찮습니다."
        )
        
        return base_message

    @staticmethod
    def check_item_name_match(ai_item_name: str, user_product_name: str) -> bool:
        """
        LLM을 사용하여 AI가 인식한 아이템명과 사용자가 입력한 상품명이
        의미적으로 일치하는지 판단합니다.
        
        예시:
        - AI: "Camera" vs User: "소니 알파 A7 카메라" → True
        - AI: "Shoes" vs User: "소니 알파 A7 카메라" → False
        
        Args:
            ai_item_name (str): AI가 인식한 아이템명 (예: "Camera")
            user_product_name (str): 사용자가 입력한 상품명 (예: "소니 알파 A7 카메라")
            
        Returns:
            bool: 일치하면 True, 불일치하면 False
        """
        prompt = f"""
다음 두 상품명이 같은 종류의 물건을 나타내는지 판단해주세요.

AI 분석 결과: "{ai_item_name}"
사용자 입력: "{user_product_name}"

판단 기준:
- AI 분석 결과가 사용자 입력 상품의 카테고리/종류와 일치하면 "일치"
- 완전히 다른 물건이면 "불일치"

예시:
- "Camera" vs "소니 알파 A7 카메라" → 일치 (둘 다 카메라)
- "Shoes" vs "소니 알파 A7 카메라" → 불일치 (신발 vs 카메라)
- "Book" vs "해리포터 소설책" → 일치 (둘 다 책)
- "Laptop" vs "맥북 프로 노트북" → 일치 (둘 다 노트북)

오직 "일치" 또는 "불일치" 한 단어로만 답변하세요:
"""
        
        try:
            response = LLMService._call_groq_api(prompt)
            result = response.strip().lower()
            
            # "일치" 또는 유사한 긍정 응답
            if "일치" in result or "match" in result or "yes" in result or "true" in result:
                logger.debug(f"✅ LLM 판단: itemName 일치 - '{ai_item_name}' ≈ '{user_product_name}'")
                return True
            else:
                logger.debug(f"❌ LLM 판단: itemName 불일치 - '{ai_item_name}' ≠ '{user_product_name}'")
                return False
                
        except Exception as e:
            logger.error(f"LLM itemName 비교 중 오류: {e}")
            # 오류 발생 시 보수적으로 True 반환 (경고를 덜 발생시킴)
            logger.warning(f"LLM 오류로 인해 itemName 일치로 간주: {ai_item_name} vs {user_product_name}")
            return True

