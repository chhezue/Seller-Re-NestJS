"""
상품 설명 생성 서비스 - 플로우차트 로직 구현

플로우차트에 따라 AI 이미지 분석과 사용자 입력을 비교하여
적절한 설명과 경고를 생성합니다.

플로우차트 요약:
1. AI 신뢰도 <= 0.5: AI 무시, 경고 없음, 사용자 데이터로만 설명 생성
2. AI 신뢰도 > 0.5:
   - AI 데이터와 User 데이터 일치: 경고 없음, AI 키워드로 설명 풍부하게
   - AI 데이터와 User 데이터 불일치:
     * 신뢰도 > 0.9: 강력한 경고
     * 신뢰도 0.5~0.9: 부드러운 경고
     * 설명은 사용자 데이터로만 생성
"""

import logging
from typing import Dict, Optional, List, Any
from collections import Counter
from services.llm_service import LLMService

# 로거 설정
logger = logging.getLogger(__name__)


class DescriptionService:
    """상품 설명 생성 서비스 - 플로우차트 로직 구현"""

    # 실제 프로젝트 카테고리 리스트 (모두 한글)
    VALID_CATEGORIES = [
        "디지털기기",
        "생활가전",
        "가구/인테리어",
        "생활/주방",
        "유아동",
        "유아도서",
        "여성의류",
        "여성잡화",
        "남성패션/잡화",
        "뷰티/미용",
        "스포츠/레저",
        "식물",
        "취미/게임/음반",
        "도서",
        "티켓/교환권",
        "가공식품",
        "건강기능식품",
        "반려동물식품",
        "기타 중고물품"
    ]
    
    # AI 모델 카테고리(영어) → 프로젝트 카테고리(한글) 매핑
    # AI가 반환하는 영어 카테고리를 한글 카테고리로 변환
    CATEGORY_MAPPINGS = {
        # 디지털기기
        "camera": "디지털기기",
        "mobile phone": "디지털기기",
        "computer keyboard": "디지털기기",
        "clock": "디지털기기",
        
        # 생활가전
        "washing machine": "생활가전",
        
        # 가구/인테리어
        "chair": "가구/인테리어",
        "desk": "가구/인테리어",
        "bookcase": "가구/인테리어",
        "house": "가구/인테리어",
        
        # 생활/주방
        "container": "생활/주방",
        "box": "생활/주방",
        
        # 유아동 (사람 관련은 제외하거나 기타로)
        "boy": "유아동",
        
        # 여성의류
        "dress": "여성의류",
        "miniskirt": "여성의류",
        
        # 여성잡화
        "boot": "여성잡화",
        "shoe": "여성잡화",
                
        # 스포츠/레저
        "bicycle": "스포츠/레저",
        "land vehicle": "스포츠/레저",
        
        # 식물
        "plant": "식물",
        "flower": "식물",
        
        # 취미/게임/음반
        "poster": "취미/게임/음반",
        "balloon": "취미/게임/음반",
        
        # 도서
        "book": "도서",
        
        # 가공식품
        "food": "가공식품",
        "drink": "가공식품",
        
        # 반려동물식품 (애완동물 관련)
        "cat": "반려동물식품",
        
        # 기타 중고물품
        "office supplies": "기타 중고물품",
        "eraser": "기타 중고물품",
        "person": "기타 중고물품",  # 사람은 상품이 아니므로 기타
        "human eye": "기타 중고물품",
        "human beard": "기타 중고물품",
    }
    
    # 다중 카테고리를 가질 수 있는 아이템들 (여러 카테고리에 일치 가능)
    MULTI_CATEGORY_ITEMS = {
        "shoe": ["여성의류", "여성잡화", "남성패션/잡화"],
        "boot": ["여성의류", "여성잡화", "남성패션/잡화"],
    }

    @staticmethod
    def _aggregate_analysis_results(analysis_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        여러 이미지의 분석 결과를 집계합니다.
        
        집계 방법:
        - 가장 많이 나온 카테고리 선택 (동점이면 신뢰도 높은 것)
        - 평균 신뢰도 계산
        - 모든 itemName 수집
        
        Args:
            analysis_results: 이미지 분석 결과 리스트
            
        Returns:
            Dict: {
                "ai_category": "Camera",
                "ai_confidence": 0.65,
                "ai_item_names": ["Camera", "Photography"],
                "all_categories": ["Camera", "Camera", "Phone"]
            }
        """
        if not analysis_results:
            return {
                "ai_category": None,
                "ai_confidence": 0.0,
                "ai_item_names": [],
                "all_categories": []
            }
        
        # 모든 카테고리 수집
        all_categories = [r["category"] for r in analysis_results]
        all_probabilities = [r["probability"] for r in analysis_results]
        all_item_names = list(set([r["itemName"] for r in analysis_results]))  # 중복 제거
        
        # 가장 많이 나온 카테고리 찾기
        category_counts = Counter(all_categories)
        most_common_category = category_counts.most_common(1)[0][0]
        
        # 해당 카테고리의 평균 신뢰도 계산
        category_probabilities = [
            r["probability"] for r in analysis_results 
            if r["category"] == most_common_category
        ]
        avg_confidence = sum(category_probabilities) / len(category_probabilities)
        
        logger.info(f"분석 결과 집계: {len(analysis_results)}개 이미지")
        logger.info(f"카테고리 분포: {dict(category_counts)}")
        logger.info(f"최종 선택: {most_common_category} (평균 신뢰도: {avg_confidence:.2%})")
        
        return {
            "ai_category": most_common_category,
            "ai_confidence": avg_confidence,
            "ai_item_names": all_item_names,
            "all_categories": all_categories
        }

    @staticmethod
    def _check_category_match(ai_category: str, user_category: str) -> bool:
        """
        AI가 인식한 카테고리(영어)와 사용자가 선택한 카테고리(한글)를 비교합니다.
        
        비교 방법:
        1. 다중 카테고리 아이템인지 확인 (shoe, boot 등)
        2. AI 카테고리를 매핑 테이블로 한글로 변환
        3. 변환된 한글 카테고리와 사용자 카테고리 비교
        4. 완전 일치 또는 부분 일치 확인
        
        Args:
            ai_category (str): AI가 인식한 카테고리 (영어, 예: "Camera", "Mobile phone")
            user_category (str): 사용자가 선택한 카테고리 (한글, 예: "디지털기기")
            
        Returns:
            bool: 일치하면 True, 불일치하면 False
        """
        # 정규화
        ai_lower = ai_category.lower().strip()
        user_norm = user_category.strip()
        
        # 1. 다중 카테고리 아이템 확인 (shoe, boot 등)
        if ai_lower in DescriptionService.MULTI_CATEGORY_ITEMS:
            possible_categories = DescriptionService.MULTI_CATEGORY_ITEMS[ai_lower]
            logger.debug(f"🔍 다중 카테고리 아이템: '{ai_category}' → {possible_categories}")
            
            # 여러 가능한 카테고리 중 하나라도 사용자 카테고리와 일치하는지 확인
            for possible_cat in possible_categories:
                if possible_cat == user_norm or possible_cat in user_norm or user_norm in possible_cat:
                    logger.debug(f"✅ 다중 카테고리 일치: '{ai_category}' → '{possible_cat}' == '{user_category}'")
                    return True
            
            logger.debug(f"❌ 다중 카테고리 불일치: '{ai_category}' → {possible_categories} ≠ '{user_category}'")
            return False
        
        # 2. 매핑 테이블에서 AI 카테고리를 한글로 변환
        mapped_korean = DescriptionService.CATEGORY_MAPPINGS.get(ai_lower)
        
        if not mapped_korean:
            # 매핑되지 않은 카테고리는 기타로 간주하거나 불일치 처리
            logger.debug(f"⚠️ 매핑되지 않은 AI 카테고리: '{ai_category}'")
            # 부분 일치 시도 (혹시 모를 경우 대비)
            if ai_lower in user_norm.lower() or user_norm.lower() in ai_lower:
                logger.debug(f"✅ 카테고리 부분 일치 (매핑 없음): '{ai_category}' ↔ '{user_category}'")
            return True

        logger.debug(f"🔄 AI 카테고리 변환: '{ai_category}' → '{mapped_korean}'")
        
        # 3. 변환된 한글 카테고리와 사용자 카테고리 비교
        # 완전 일치
        if mapped_korean == user_norm:
            logger.debug(f"✅ 카테고리 완전 일치: '{mapped_korean}' == '{user_category}'")
            return True
        
        # 부분 일치
        if mapped_korean in user_norm or user_norm in mapped_korean:
            logger.debug(f"✅ 카테고리 부분 일치: '{mapped_korean}' ↔ '{user_category}'")
            return True
        
        logger.debug(f"❌ 카테고리 불일치: AI='{ai_category}'→'{mapped_korean}' ≠ User='{user_category}'")
        return False
    
    @staticmethod
    def _check_item_name_consistency(ai_item_names: List[str], user_product_name: str) -> bool:
        """
        AI가 인식한 itemName들이 사용자가 입력한 상품명과 일치하는지 LLM으로 검증합니다.
        
        이중 검증 레이어: 카테고리는 일치하지만 itemName이 완전히 다르면 경고
        
        예시:
        - AI itemNames: ["Camera", "Photography"]
        - User name: "소니 알파 A7 카메라"
        → LLM 판단: "Camera"와 "소니 알파 A7 카메라"가 같은 물건인지 확인
        
        Args:
            ai_item_names: AI가 인식한 아이템명 리스트 (예: ["Camera", "Photography"])
            user_product_name: 사용자가 입력한 상품명 (예: "소니 알파 A7 카메라")
            
        Returns:
            bool: 일관성이 있으면 True, 의심스러우면 False
        """
        # itemName들 중 하나라도 사용자 상품명과 매칭되는지 LLM으로 확인
        for item_name in ai_item_names:
            if LLMService.check_item_name_match(item_name, user_product_name):
                logger.debug(f"✅ itemName 일치: '{item_name}' ≈ '{user_product_name}'")
                return True
        
        # 모든 itemName이 사용자 상품명과 불일치
        logger.warning(f"❌ itemName 불일치: {ai_item_names} vs '{user_product_name}'")
        return False

    @staticmethod
    def generate_description_and_warning(
        user_name: str,
        category_name: str,
        condition: str,
        analysis_results: List[Dict[str, Any]]
    ) -> Dict[str, Optional[str]]:
        """
        플로우차트에 따라 상품 설명과 경고를 생성합니다.
        
        전체 플로우:
        1. 이미지 분석 결과 집계
        2. AI 신뢰도 체크
        3. 카테고리 일치 여부 확인
        4. itemName 추가 검증 (선택적)
        5. 적절한 설명과 경고 생성
        
        Args:
            user_name (str): 사용자가 입력한 상품명
            category_name (str): 사용자가 선택한 카테고리명
            condition (str): 상품 상태 (예: "새것", "중고")
            analysis_results (List[Dict]): 이미지 분석 결과 리스트
                [
                    {
                        "id": "uuid",
                        "tempUrl": "/path",
                        "category": "Camera",
                        "itemName": "Camera",
                        "probability": 0.85
                    },
                    ...
                ]
            
        Returns:
            Dict[str, Optional[str]]: 
                {
                    "description": "생성된 설명",
                    "warning": "경고 메시지" 또는 None
                }
        """
        logger.info("=" * 80)
        logger.info("🚀 상품 설명 생성 프로세스 시작")
        logger.info("=" * 80)
        logger.info(f"📦 상품 정보:")
        logger.info(f"   - 상품명: {user_name}")
        logger.info(f"   - 카테고리: {category_name}")
        logger.info(f"   - 상태: {condition}")
        logger.info(f"   - 이미지 개수: {len(analysis_results)}")
        logger.info("")
        
        # ============================================================
        # Step 1: 이미지 분석 결과 집계
        # ============================================================
        logger.info("📊 [Step 1] 이미지 분석 결과 집계")
        logger.info("-" * 80)
        
        if not analysis_results or len(analysis_results) == 0:
            logger.warning("⚠️  이미지 분석 결과가 없습니다")
            logger.info("")
            logger.info("🔀 의사결정: AI 데이터 없음")
            logger.info("   ├─ Description: 사용자 데이터만 사용")
            logger.info("   └─ Warning: null (이유: 분석 결과 없음)")
            logger.info("=" * 80)
            return {
                "description": LLMService.generate_description_user_only(
                    user_name, category_name, condition
                ),
                "warning": None
            }
        
        # 여러 이미지 결과 집계
        aggregated = DescriptionService._aggregate_analysis_results(analysis_results)
        
        ai_category = aggregated["ai_category"]
        ai_confidence = aggregated["ai_confidence"]
        ai_item_names = aggregated["ai_item_names"]
        
        if not ai_category:
            logger.warning("⚠️  집계된 AI 카테고리가 없습니다")
            logger.info("")
            logger.info("🔀 의사결정: AI 카테고리 없음")
            logger.info("   ├─ Description: 사용자 데이터만 사용")
            logger.info("   └─ Warning: null (이유: 카테고리 집계 실패)")
            logger.info("=" * 80)
            return {
                "description": LLMService.generate_description_user_only(
                    user_name, category_name, condition
                ),
                "warning": None
            }
        
        logger.info(f"✅ 집계 완료:")
        logger.info(f"   - AI 카테고리: {ai_category}")
        logger.info(f"   - 평균 신뢰도: {ai_confidence:.2%} ({ai_confidence:.4f})")
        logger.info(f"   - AI itemNames: {ai_item_names}")
        logger.info("")
        
        # ============================================================
        # Step 2: 신뢰도 체크 (Confidence > 0.3 ?)
        # ============================================================
        CONFIDENCE_THRESHOLD = 0.3  # 30%
        
        logger.info("🎯 [Step 2] AI 신뢰도 검증")
        logger.info("-" * 80)
        logger.info(f"   신뢰도 임계값: {CONFIDENCE_THRESHOLD} ({CONFIDENCE_THRESHOLD:.0%})")
        logger.info(f"   현재 신뢰도: {ai_confidence:.2%} ({ai_confidence:.4f})")
        
        if ai_confidence <= CONFIDENCE_THRESHOLD:
            # 분기 1: 신뢰도 낮음 (AI 무시)
            logger.warning(f"❌ 신뢰도 낮음: {ai_confidence:.2%} <= {CONFIDENCE_THRESHOLD:.0%}")
            logger.info("")
            logger.info("🔀 의사결정: AI 신뢰도 부족으로 AI 데이터 무시")
            logger.info("   ├─ Description: 사용자 데이터만 사용 (AI 키워드 미사용)")
            logger.info("   └─ Warning: null (이유: AI 신뢰도 낮음 - 경고 불필요)")
            logger.info("")
            logger.info(f"💡 해설: 신뢰도가 {CONFIDENCE_THRESHOLD:.0%} 이하일 경우 AI 분석 결과가 부정확할 가능성이 높아")
            logger.info("         AI 데이터를 무시하고 사용자가 입력한 정보만으로 설명을 생성합니다.")
            logger.info("=" * 80)
            
            return {
                "description": LLMService.generate_description_user_only(
                    user_name, category_name, condition
                ),
                "warning": None
            }
        
        logger.info(f"✅ 신뢰도 충분: {ai_confidence:.2%} > {CONFIDENCE_THRESHOLD:.0%}")
        logger.info("   → AI 데이터 사용 가능, 다음 단계로 진행")
        logger.info("")
        
        # ============================================================
        # Step 3: 카테고리 일치 여부 확인
        # ============================================================
        logger.info("🔍 [Step 3] 카테고리 일치 검증")
        logger.info("-" * 80)
        logger.info(f"   AI 카테고리: '{ai_category}'")
        logger.info(f"   사용자 카테고리: '{category_name}'")
        
        category_match = DescriptionService._check_category_match(ai_category, category_name)
        
        if category_match:
            logger.info(f"✅ 카테고리 일치: '{ai_category}' ≈ '{category_name}'")
        else:
            logger.warning(f"❌ 카테고리 불일치: '{ai_category}' ≠ '{category_name}'")
        logger.info("")
        
        # ============================================================
        # Step 3-1: itemName 추가 검증 (이중 검증)
        # ============================================================
        logger.info("🔍 [Step 3-1] ItemName 일관성 검증 (이중 검증)")
        logger.info("-" * 80)
        logger.info(f"   AI ItemNames: {ai_item_names}")
        logger.info(f"   사용자 상품명: '{user_name}'")
        
        item_name_consistent = DescriptionService._check_item_name_consistency(
            ai_item_names, category_name
        )
        
        if item_name_consistent:
            logger.info(f"✅ ItemName 일관성 확인: AI 인식 결과가 사용자 카테고리와 일치")
        else:
            logger.warning(f"❌ ItemName 불일치: AI 인식 결과({ai_item_names})가 사용자 카테고리({category_name})와 다름")
        logger.info("")
        
        # 최종 판단: 카테고리와 itemName 모두 고려
        is_match = category_match and item_name_consistent
        
        logger.info("📋 최종 검증 결과:")
        logger.info(f"   - 카테고리 일치: {'✅ Yes' if category_match else '❌ No'}")
        logger.info(f"   - ItemName 일관성: {'✅ Yes' if item_name_consistent else '❌ No'}")
        logger.info(f"   - 종합 판단: {'✅ 일치' if is_match else '❌ 불일치'}")
        logger.info("")
        
        if is_match:
            # 분기 2: 데이터 일치 (카테고리 + itemName 모두 일치)
            logger.info("🎉 [결과] 데이터 완전 일치!")
            logger.info("-" * 80)
            logger.info("")
            logger.info("🔀 의사결정: AI 데이터와 사용자 데이터 일치")
            logger.info("   ├─ Description: AI 키워드 활용하여 풍부한 설명 생성")
            logger.info(f"   │   사용할 AI 키워드: {ai_item_names}")
            logger.info("   └─ Warning: null (이유: 데이터 일치 - 경고 불필요)")
            logger.info("")
            logger.info("💡 해설: AI 분석 결과와 사용자 입력이 일치하여 신뢰할 수 있는 상태입니다.")
            logger.info("         AI가 인식한 키워드를 활용하여 더 상세하고 매력적인 설명을 작성합니다.")
            logger.info("=" * 80)
            
            return {
                "description": LLMService.generate_description_with_ai_keywords(
                    user_name, category_name, condition, ai_item_names
                ),
                "warning": None
            }
        
        # ============================================================
        # 분기 3: 데이터 불일치 (경고 생성)
        # ============================================================
        logger.warning("⚠️  [결과] 데이터 불일치 감지!")
        logger.info("-" * 80)
        
        if not category_match:
            logger.warning(f"   ❌ 카테고리 불일치: '{ai_category}' ≠ '{category_name}'")
        if not item_name_consistent:
            logger.warning(f"   ❌ ItemName 불일치: {ai_item_names} ≠ {category_name}")
        logger.info("")
        
        logger.info("🔀 의사결정: 데이터 불일치 - 경고 필요")
        logger.info("   ├─ Description: 사용자 데이터만 사용 (AI 키워드 미사용)")
        logger.info("   │   이유: AI 분석 결과를 신뢰할 수 없어 안전하게 사용자 입력만 사용")
        
        # 설명은 사용자 데이터로만 생성 (AI 키워드 절대 미사용)
        description = LLMService.generate_description_user_only(
            user_name, category_name, condition
        )
        
        # 신뢰도에 따라 경고 메시지 생성
        HIGH_CONFIDENCE_WARNING_THRESHOLD = 0.7  # 70%
        
        logger.info("   └─ Warning: 생성 필요")
        logger.info("")
        logger.info("⚠️  경고 메시지 생성 중...")
        logger.info(f"   현재 신뢰도: {ai_confidence:.2%}")
        logger.info(f"   강력한 경고 임계값: {HIGH_CONFIDENCE_WARNING_THRESHOLD:.0%}")
        
        if ai_confidence > HIGH_CONFIDENCE_WARNING_THRESHOLD:
            # 신뢰도 높음: 강력한 경고
            logger.warning(f"   🚨 신뢰도 높음 ({ai_confidence:.2%} > {HIGH_CONFIDENCE_WARNING_THRESHOLD:.0%}): 강력한 경고 생성")
            logger.info(f"   이유: AI가 매우 확신하는데 사용자 입력과 다름 → 사용자에게 재확인 필요")
            warning = LLMService.generate_warning_high_confidence(
                ai_category, category_name, ai_confidence, ai_item_names
            )
        else:
            # 신뢰도 중간: 부드러운 경고
            logger.info(f"   💡 신뢰도 중간 ({ai_confidence:.2%}, 30~{HIGH_CONFIDENCE_WARNING_THRESHOLD:.0%}): 부드러운 경고 생성")
            logger.info(f"   이유: AI가 어느 정도 확신하나 완전히 확실하지 않음 → 참고용 경고")
            warning = LLMService.generate_warning_medium_confidence(
                ai_category, category_name, ai_confidence, ai_item_names
            )
        
        logger.info("")
        logger.info("📝 생성된 경고:")
        logger.info(f"   {warning}")
        logger.info("")
        logger.info("💡 해설: AI 분석 결과와 사용자 입력이 다릅니다.")
        logger.info("         사용자가 올바른 정보를 입력했는지 확인할 수 있도록 경고를 표시합니다.")
        logger.info(f"         신뢰도 {HIGH_CONFIDENCE_WARNING_THRESHOLD:.0%} 초과: 강한 경고, {HIGH_CONFIDENCE_WARNING_THRESHOLD:.0%} 이하: 부드러운 경고를 생성합니다.")
        logger.info("=" * 80)
        
        return {
            "description": description,
            "warning": warning
        }

