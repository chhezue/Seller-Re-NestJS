from pydantic import BaseModel
from typing import List

class AnalysisRequest(BaseModel):
    """API 요청 본문의 형식을 정의하는 Pydantic 모델"""
    image_path: str
    labels: List[str]

class AnalysisResult(BaseModel):
    """분석 결과 항목 하나의 형식을 정의"""
    keyword: str
    probability: float

class AnalysisResponse(BaseModel):
    """API 응답 본문의 형식을 정의"""
    results: List[AnalysisResult]
