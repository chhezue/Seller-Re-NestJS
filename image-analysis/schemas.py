from pydantic import BaseModel, Field
from typing import List, Optional

class AnalysisRequest(BaseModel):
    """API 요청 본문의 형식을 정의하는 Pydantic 모델"""
    image_path: str
    labels: Optional[List[str]] = Field(None, description="이 필드는 더 이상 사용되지 않습니다.")

class AnalysisResult(BaseModel):
    """분석 결과 항목 하나의 형식을 정의"""
    keyword: str
    probability: float

class AnalysisResponse(BaseModel):
    """API 응답 본문의 형식을 정의"""
    results: List[AnalysisResult]