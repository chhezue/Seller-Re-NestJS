import json
import logging
import re
from typing import Dict

from services.llm_service import LLMService

logger = logging.getLogger(__name__)


class AnalysisDescriptionLLMService:
    """LLM을 사용해 상품 설명을 분석하고 피드백 3종을 JSON으로 반환"""

    CONDITION_MAP = {
        "NEW": "새상품",
        "LIKE_NEW": "거의 새것",
        "USED": "사용감 있음",
        "FOR_PARTS": "사용감 많음",
    }

    SYSTEM_PROMPT = (
        "당신은 중고거래 플랫폼의 '상품 설명 분석 AI'입니다. "
        "당신의 임무는 사용자가 작성한 [상품 설명]과 그가 선택한 [상품 상태]를 비교 분석하여, "
        "3가지 항목(사용감, 필수정보, 금칙어)에 대한 피드백을 제공하는 것입니다. "
        "모든 피드백은 친절하지만 전문적인 조언의 어조로 작성해야 합니다."
    )

    FORBIDDEN_WORDS = [
        "정품 100%", "100% 보장", "최저가", "무조건", "완벽", "새것과 동일", "S급", "A급"
    ]

    @staticmethod
    def _heuristic_pre_analysis(name: str, condition: str, description: str) -> Dict:
        """LLM 호출 전, 설명 텍스트를 정규식/키워드로 선분석하여 로그에 남김"""
        text = description.lower()

        # 금칙어 탐지 (원문 기준 대소문자 무시)
        forbidden_found = []
        for w in AnalysisDescriptionLLMService.FORBIDDEN_WORDS:
            if w.lower() in text:
                forbidden_found.append(w)

        # 필수 정보 탐지
        has_size = any(k in text for k in ["사이즈", "size", "cm", "mm"]) or bool(re.search(r"\b(2[2-9]0|3[0-5]0)\b", text))
        has_purchase_time = any(k in text for k in ["구매", "구입", "작년", "올해"]) or bool(re.search(r"\b\d{4}\s*년\b", text))
        has_storage = any(k in text for k in ["보관", "더스트백", "케이스", "신발장", "슈트리", "건조", "습기"])        
        has_components = any(k in text for k in ["풀박스", "박스", "택", "구성품", "영수증", "끈", "속지", "더스트백"])        

        # 상태-설명 모순 탐지
        condition_upper = condition.upper().strip()
        contradict_new = any(k in text for k in ["사용", "착용", "스크래치", "오염", "닳", "사용감"])  # NEW와 모순
        claims_new = any(k in text for k in ["미개봉", "새상품", "새 것", "새것과 동일"])             # USED와 모순 가능

        contradictions = []
        if condition_upper == "NEW" and contradict_new:
            contradictions.append("상태 '새상품'이나 사용 흔적 단어가 포함됨")
        if condition_upper in ("USED", "FOR_PARTS") and claims_new:
            contradictions.append("상태가 중고인데 '새상품/새것과 동일' 표현 포함")

        result = {
            "name": name,
            "condition": condition_upper,
            "has_size": has_size,
            "has_purchase_time": has_purchase_time,
            "has_storage": has_storage,
            "has_components": has_components,
            "forbidden_found": forbidden_found,
            "contradictions": contradictions,
            "desc_len": len(description or ""),
        }

        # 로그 기록
        logger.info("[설명분석] 입력 요약 | name='%s' condition='%s' desc_len=%d", name, condition_upper, result["desc_len"])
        logger.info("[설명분석] 필수정보 | size=%s purchase=%s storage=%s components=%s",
                    result["has_size"], result["has_purchase_time"], result["has_storage"], result["has_components"])
        logger.info("[설명분석] 금칙어 | found=%s", ", ".join(result["forbidden_found"]) if result["forbidden_found"] else "없음")
        logger.info("[설명분석] 상태 모순 | %s", "; ".join(result["contradictions"]) if result["contradictions"] else "없음")

        return result

    @staticmethod
    def _build_user_prompt(name: str, condition: str, description: str) -> str:
        condition_kr = AnalysisDescriptionLLMService.CONDITION_MAP.get(condition, condition)
        forbidden_list = ", ".join([f'"{w}"' for w in AnalysisDescriptionLLMService.FORBIDDEN_WORDS])

        return f'''
[분석 기준]
1.  **사용감 (conditionFeedback):**
    * [상품 상태]와 [상품 설명]의 내용이 일치하는지 확인합니다.
    * 만약 [상품 상태]가 "새상품"인데 설명에 "착용"이나 "사용" 같은 단어가 있으면 모순을 지적합니다.
    * 만약 [상품 상태]가 "사용감 있음"인데 설명이 너무 부실하면, '착용 횟수', '오염 부위' 등을 명시하라고 조언합니다.
    * "새상품"이라고 해도 "미개봉"인지, "단순 개봉"인지 명시하면 신뢰도가 오른다고 조언할 수 있습니다.
    * 일치하고 잘 작성되었다면 칭찬합니다.

2.  **필수정보 (requiredInfoFeedback):**
    * [상품 설명]에 다음 필수 정보가 누락되었는지 확인합니다: [사이즈, 구매 시기, 보관 상태, 구성품(예: 박스, 택, 더스트백 등)]
    * 누락된 정보가 있다면, 어떤 정보가 빠졌는지 명확히 알려줍니다.
    * 필수 정보가 잘 포함되어 있다면 칭찬합니다.

3.  **금칙어 (forbiddenWordsFeedback):**
    * [상품 설명]에 과장되거나 오해의 소지가 있는 금칙어가 있는지 확인합니다.
    * 금칙어 목록: [{forbidden_list}]
    * 금칙어가 발견되면 해당 표현을 지적하고, 중고거래 시 오해를 줄 수 있음을 설명합니다.
    * 금칙어가 발견되지 않으면, "과장되거나 오해의 소지가 있는 표현은 발견되지 않았습니다."라고 확인해 줍니다.

[출력 형식]
반드시 다음 JSON 형식을 따라야 합니다. 각 항목의 값은 분석 기준에 따른 피드백 '문자열'이어야 합니다.

{{
  "conditionFeedback": "...",
  "requiredInfoFeedback": "...",
  "forbiddenWordsFeedback": "..."
}}
---
[USER]
[상품 설명]:
"""
{description}
"""

[상품 상태]:
"{condition_kr}"

[참고] 상품명: "{name}"

[제약]
- 반드시 위 JSON만 출력 (설명, 코드블럭, 마크다운, 추가 텍스트 금지)
- 키 이름과 대소문자 반드시 일치: conditionFeedback, requiredInfoFeedback, forbiddenWordsFeedback
- 한국어로만 작성
'''

    @staticmethod
    def _extract_json(text: str) -> Dict:
        # 코드펜스 제거 및 JSON 부분 추출
        cleaned = re.sub(r"```[\w]*", "", text).strip()
        # 첫 { 부터 마지막 } 까지 추출 시도
        try:
            start = cleaned.index("{")
            end = cleaned.rindex("}") + 1
            snippet = cleaned[start:end]
            return json.loads(snippet)
        except Exception:
            # 바로 파싱 시도
            try:
                return json.loads(cleaned)
            except Exception:
                raise ValueError("LLM 응답에서 유효한 JSON을 추출하지 못했습니다.")

    @staticmethod
    def analyze_description(name: str, condition: str, description: str) -> Dict[str, str]:
        # 1) 휴리스틱 선분석 및 로깅
        pre = AnalysisDescriptionLLMService._heuristic_pre_analysis(name, condition, description)

        # 2) 프롬프트 구성
        user_prompt = AnalysisDescriptionLLMService._build_user_prompt(name, condition, description)
        logger.info("[설명분석] 프롬프트 준비 완료 (SYSTEM 규칙 적용)")

        # 3) LLM 호출
        response_text = LLMService._call_groq_api(
            prompt=user_prompt,
            system=AnalysisDescriptionLLMService.SYSTEM_PROMPT,
        )
        try:
            data = AnalysisDescriptionLLMService._extract_json(response_text)
        except ValueError:
            # 재시도: 더 강한 제약으로 요청
            retry_prompt = user_prompt + "\n\n중요: 오직 JSON만 출력하세요."
            response_text = LLMService._call_groq_api(
                prompt=retry_prompt,
                system=AnalysisDescriptionLLMService.SYSTEM_PROMPT,
            )
            data = AnalysisDescriptionLLMService._extract_json(response_text)

        # 필수 키 검증
        for key in ("conditionFeedback", "requiredInfoFeedback", "forbiddenWordsFeedback"):
            if key not in data or not isinstance(data[key], str):
                raise ValueError(f"LLM 응답 JSON에 '{key}' 필드가 없습니다.")

        # 4) 결과 요약 로깅
        logger.info("[설명분석] 결과 수신 | conditionFeedback=%d자 requiredInfoFeedback=%d자 forbiddenWordsFeedback=%d자",
                    len(data["conditionFeedback"] or ""), len(data["requiredInfoFeedback"] or ""), len(data["forbiddenWordsFeedback"] or ""))
        logger.info("[설명분석] 결과 JSON=%s", json.dumps({
            "conditionFeedback": data["conditionFeedback"][:120] + ("..." if len(data["conditionFeedback"]) > 120 else ""),
            "requiredInfoFeedback": data["requiredInfoFeedback"][:120] + ("..." if len(data["requiredInfoFeedback"]) > 120 else ""),
            "forbiddenWordsFeedback": data["forbiddenWordsFeedback"][:120] + ("..." if len(data["forbiddenWordsFeedback"]) > 120 else ""),
        }, ensure_ascii=False))
        logger.info("[설명분석] 파이프라인 완료")

        return {
            "conditionFeedback": data["conditionFeedback"].strip(),
            "requiredInfoFeedback": data["requiredInfoFeedback"].strip(),
            "forbiddenWordsFeedback": data["forbiddenWordsFeedback"].strip(),
        }
