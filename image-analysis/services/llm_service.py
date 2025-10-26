"""
LLM 기반 상품 설명 생성 서비스

GROQ API를 사용하여 상품 설명을 자동으로 생성합니다.
"""

import os
import json
import logging
import requests
from typing import Optional, Dict, Any
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
다음 정보를 바탕으로 판매자가 올린 상품에 대한 매력적이고 정확한 설명을 작성해주세요.

[상품 정보]
- 상품명: {user_name}
- 카테고리: {category_name}
- 상태: {condition_kr}
- AI 이미지 분석 결과: {ai_keywords_str}

[작성 가이드라인]
1. 상품명을 그대로 활용하여 시작하세요 (예: "{user_name}입니다.")
2. 2-3문장, 100자 내외로 간결하게 작성
3. AI 분석 결과를 자연스럽게 반영하여 상품의 특징 설명
4. 상품 상태({condition_kr})를 명확하게 언급
5. 구매자가 관심 가질 만한 포인트 강조
6. 존댓말 사용 (～입니다, ～습니다)
7. 과장하지 않고 사실적으로 작성

[금지 사항]
- 가격 언급 금지
- 거래 방법이나 위치 언급 금지
- 존재하지 않는 정보 추측 금지
- 브랜드나 모델명을 임의로 변경하지 말 것
- "문의주세요", "연락주세요" 같은 행동 유도 금지

[예시]
상품명이 "아이폰 13 프로"이고 상태가 "거의 새것"이면:
"아이폰 13 프로입니다. 구매 후 몇 번 사용하지 않아 거의 새것과 같은 상태이며, 스크래치나 손상 없이 깨끗합니다. 정상 작동하며 배터리 성능도 우수합니다."

상품 설명만 출력하세요:
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

[상품 정보]
- 상품명: {user_name}
- 카테고리: {category_name}
- 상태: {condition_kr}

[작성 가이드라인]
1. 상품명을 그대로 활용하여 시작하세요 (예: "{user_name}입니다.")
2. 2-3문장, 80-100자 내외로 간결하게 작성
3. 상품 상태({condition_kr})를 명확하게 언급
4. 카테고리({category_name})에 맞는 일반적인 특징 언급 가능
5. 구매자에게 유용한 정보 제공
6. 존댓말 사용 (～입니다, ～습니다)
7. 사실적이고 객관적으로 작성

[금지 사항]
- 가격 언급 금지
- 거래 방법이나 위치 언급 금지
- 확인되지 않은 사양이나 스펙 추측 금지
- 상품명에 없는 브랜드나 모델명 추가 금지
- 과도한 감정 표현이나 과장 금지
- "문의주세요", "연락주세요" 같은 행동 유도 금지
- "완벽", "최고급", "새것과 동일" 같은 과장된 표현 금지

[예시]
상품명: "LG 세탁기", 상태: "사용감 있음"
출력: "LG 세탁기입니다. 사용감이 있지만 정상 작동하며 세탁 성능에는 문제가 없습니다. 실사용 가능한 상품입니다."

상품명: "책상", 상태: "거의 새것"
출력: "책상입니다. 거의 새것에 가까운 상태로 눈에 띄는 흠집이나 손상이 없습니다. 실용적으로 사용하실 수 있습니다."

상품 설명만 출력하세요:
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
        신뢰도가 높을 때 (>0.9) 강력한 경고 메시지를 생성합니다.
        
        Args:
            ai_category (str): AI가 인식한 카테고리
            user_category (str): 사용자가 선택한 카테고리
            confidence (float): AI 신뢰도 (0.0 ~ 1.0)
            ai_item_names (list[str], optional): AI가 인식한 아이템명 리스트
            
        Returns:
            str: 경고 메시지
        """
        confidence_percent = int(confidence * 100)
        
        base_message = (
            f"⚠️ 카테고리 불일치 경고: AI 이미지 분석 결과 신뢰도 {confidence_percent}%로 "
            f"'{ai_category}'입니다. 그러나 '{user_category}' 카테고리로 등록하셨습니다. "
            f"카테고리가 정확한지 다시 한 번 확인해주세요. "
            f"잘못된 카테고리는 판매에 부정적인 영향을 줄 수 있습니다."
        )
        
        # itemName 정보가 있고, category와 다른 경우 추가 정보 제공
        if ai_item_names and len(ai_item_names) > 0:
            items_str = ", ".join(ai_item_names[:3])  # 최대 3개만 표시
            base_message += f" (인식된 아이템: {items_str})"
        
        return base_message

    @staticmethod
    def generate_warning_medium_confidence(
        ai_category: str,
        user_category: str,
        confidence: float,
        ai_item_names: list[str] = None
    ) -> str:
        """
        신뢰도가 중간일 때 (0.5~0.9) 부드러운 경고 메시지를 생성합니다.
        
        Args:
            ai_category (str): AI가 인식한 카테고리
            user_category (str): 사용자가 선택한 카테고리
            confidence (float): AI 신뢰도 (0.0 ~ 1.0)
            ai_item_names (list[str], optional): AI가 인식한 아이템명 리스트
            
        Returns:
            str: 경고 메시지
        """
        confidence_percent = int(confidence * 100)
        
        base_message = (
            f"💡 참고: AI 이미지 분석 결과 '{ai_category}'로 인식됩니다 (신뢰도 {confidence_percent}%). "
            f"'{user_category}' 카테고리로 등록하셨는데, 혹시 카테고리가 정확한지 확인해주세요. "
            f"만약 맞다면 무시하셔도 됩니다."
        )
        
        # itemName 정보 추가
        if ai_item_names and len(ai_item_names) > 0:
            items_str = ", ".join(ai_item_names[:3])
            base_message += f" (인식된 아이템: {items_str})"
        
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

