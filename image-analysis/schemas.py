from pydantic import BaseModel, Field
from typing import List, Optional

class AnalysisRequest(BaseModel):
    """API 요청 본문의 형식을 정의하는 Pydantic 모델"""
    image_paths: List[str]
    labels: Optional[List[str]] = Field(None, description="이 필드는 더 이상 사용되지 않습니다.")

class AnalysisResult(BaseModel):
    """분석 결과 항목 하나의 형식을 정의"""
    category: str
    itemName: str
    probability: float
    # New fields for image origin analysis
    origin_score: Optional[int] = None
    origin_classification: Optional[str] = None
    origin_likelihood: Optional[dict] = None

class AnalysisResponse(BaseModel):
    """API 응답 본문의 형식을 정의"""
    results: List[AnalysisResult]