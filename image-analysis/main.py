import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from schemas import AnalysisRequest, AnalysisResponse, AnalysisResult
from model.loader import load_model
from model.predictor import predict_multiple
from image_origin_analyzer import analyze_image_origin
import json
import logging

# 로깅 설정
logging.basicConfig(
    filename='error.log',
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

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
    여러 이미지 경로를 받아 이미지 분석을 수행하고, 결과를 집계하여 반환합니다.
    """
    try:
        # 여러 이미지에 대한 예측 함수 호출
        prediction_results = predict_multiple(request.image_paths)
        
        response_results = []
        for result_from_prediction in prediction_results:
            # 이미지 원본 분석 수행
            # predict_multiple에서 반환된 absolute_image_path를 사용합니다.
            absolute_image_path = result_from_prediction.get("absolute_image_path")
            if not absolute_image_path:
                # absolute_image_path가 없는 경우 (예: 파일이 발견되지 않아 스킵된 경우)
                # 해당 이미지에 대한 원본 분석은 건너뛰고 기본값으로 설정합니다.
                origin_analysis_result = {
                    "score": None,
                    "classification": "분석 불가",
                    "likelihood": {"user_taken": None, "internet_download": None, "ai_generated": None}
                }
            else:
                origin_analysis_result = analyze_image_origin(absolute_image_path)
            
            # 예측 결과와 원본 분석 결과를 결합
            combined_result = {
                **result_from_prediction,
                "origin_score": origin_analysis_result.get("score"),
                "origin_classification": origin_analysis_result.get("classification"),
                "origin_likelihood": origin_analysis_result.get("likelihood"),
            }
            # absolute_image_path는 AnalysisResult 스키마에 없으므로 제거합니다.
            combined_result.pop("absolute_image_path", None)
            response_results.append(AnalysisResult(**combined_result))
        
        return AnalysisResponse(results=response_results)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # 예외 로깅
        logging.error(f"An unexpected error occurred: {e}", exc_info=True)
        # 그 외 모든 예외 처리
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

# uvicorn image_analysis.main:app --reload