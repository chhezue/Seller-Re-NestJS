import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from schemas import AnalysisRequest, AnalysisResponse, AnalysisResult
from model.loader import load_model
from model.predictor import predict
import json

# 서버 시작/종료 시 수행할 작업을 정의합니다.
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시 모델을 로드합니다.
    load_model()
    yield
    # 서버 종료 시 정리 작업 (필요 시)

# FastAPI 앱 인스턴스 생성 및 lifespan 설정
app = FastAPI(lifespan=lifespan)

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 출처 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메소드 허용
    allow_headers=["*"],  # 모든 HTTP 헤더 허용
)

@app.get("/")
def read_root():
    return {"message": "Image Analysis API is running."}

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_image(request: AnalysisRequest):
    """
    이미지 경로와 레이블 목록을 받아 이미지 분석을 수행합니다.
    """
    try:
        # 예측 함수 호출
        prediction_results = predict(request.image_path, request.labels)
        
        # 결과를 AnalysisResult 모델 리스트로 변환
        response_results = [AnalysisResult(**item) for item in prediction_results]
        
        return AnalysisResponse(results=response_results)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # 그 외 모든 예외 처리
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

# uvicorn image_analysis.main:app --reload