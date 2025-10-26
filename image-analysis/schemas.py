from pydantic import BaseModel, Field
from typing import List, Optional

class AnalysisRequest(BaseModel):
    """API 요청 본문의 형식을 정의하는 Pydantic 모델"""
    image_paths: List[str]
    labels: Optional[List[str]] = Field(None, description="이 필드는 더 이상 사용되지 않습니다.")

class AnalysisResult(BaseModel):
    """분석 결과 항목 하나의 형식을 정의"""
    keyword: str
    probability: float

class AnalysisResponse(BaseModel):
    """API 응답 본문의 형식을 정의"""
    results: List[AnalysisResult]

class DescriptionRequest(BaseModel):
    """상품 설명 생성 요청 스키마 - NestJS에서 전달"""
    name: str = Field(..., description="사용자가 입력한 상품명")
    category_name: str = Field(..., description="사용자가 선택한 카테고리명")
    condition: str = Field(..., description="상품 상태 (예: 새것, 중고)")
    image_urls: List[str] = Field(..., description="분석할 이미지 URL 리스트")

class DescriptionResponse(BaseModel):
    """상품 설명 생성 응답 스키마"""
    description: str = Field(..., description="생성된 상품 설명")
    warning: Optional[str] = Field(None, description="카테고리 불일치 경고 메시지 (있을 경우)")