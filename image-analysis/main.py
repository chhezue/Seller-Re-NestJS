import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from schemas import AnalysisRequest, AnalysisResponse, AnalysisResult, DescriptionRequest, DescriptionResponse, AnalysisDescriptionRequest, AnalysisDescriptionResponse
from model.loader import load_model
from model.predictor import predict_multiple
from services.description_service import DescriptionService
from services.analysis_description_service import AnalysisDescriptionLLMService
import logging
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),  # 모든 로그를 app.log에 저장
        logging.StreamHandler()  # 콘솔에도 출력
    ]
)

# ERROR 레벨 로그만 별도로 error.log에 저장
error_handler = logging.FileHandler('error.log')
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logging.getLogger().addHandler(error_handler)

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
        
        # 결과를 AnalysisResult 모델 리스트로 변환
        response_results = [AnalysisResult(**item) for item in prediction_results]
        
        return AnalysisResponse(results=response_results)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # 예외 로깅
        logging.error(f"An unexpected error occurred: {e}", exc_info=True)
        # 그 외 모든 예외 처리
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.post("/generate-description", response_model=DescriptionResponse)
def generate_description(request: DescriptionRequest):
    try:
        logging.info(f"설명 생성 요청: {request.name} (이미지 {len(request.image_urls)}개)")
        
        # Step 1: 이미지 분석 수행 (Python 내부 모델 사용)
        logging.info("Step 1: 이미지 분석 중...")
        analysis_results = predict_multiple(request.image_urls)
        
        # predict_multiple 결과를 DescriptionService가 필요한 형식으로 변환
        # predict_multiple 반환: [{"keyword": "Camera", "probability": 0.85}, ...]
        # DescriptionService 필요: [{"category": "Camera", "itemName": "Camera", "probability": 0.85}, ...]
        
        formatted_results = []
        for result in analysis_results:
            formatted_results.append({
                "category": result["keyword"],      # keyword → category
                "itemName": result["keyword"],       # keyword → itemName
                "probability": result["probability"]
            })
        
        logging.info(f"이미지 분석 완료: {formatted_results}")
        
        # Step 2: 플로우차트 로직에 따라 설명과 경고 생성
        logging.info("Step 2: 설명 및 경고 생성 중...")
        result = DescriptionService.generate_description_and_warning(
            user_name=request.name,
            category_name=request.category_name,
            condition=request.condition,
            analysis_results=formatted_results
        )
        
        return DescriptionResponse(
            description=result["description"],
            warning=result["warning"]
        )
        
    except ValueError as e:
        # GROQ API 키 미설정 등
        logging.error(f"Configuration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"서버 설정 오류: {str(e)}")
    
    except FileNotFoundError as e:
        # 이미지 파일을 찾을 수 없는 경우
        logging.error(f"File not found: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail=f"이미지를 찾을 수 없습니다: {str(e)}")
    
    except Exception as e:
        # 예상치 못한 오류
        logging.error(f"Unexpected error in generate_description: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"설명 생성 중 오류가 발생했습니다: {str(e)}")

@app.post("/analyze-description", response_model=AnalysisDescriptionResponse)
def analyze_description_text(request: AnalysisDescriptionRequest):
    try:
        logging.info("설명 분석 요청 수신")
        result = AnalysisDescriptionLLMService.analyze_description(
            name=request.name,
            condition=request.condition,
            description=request.description,
        )
        return AnalysisDescriptionResponse(**result)
    except ValueError as e:
        logging.error(f"LLM 설정/파싱 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"설명 분석 중 오류가 발생했습니다: {str(e)}")
    except Exception as e:
        logging.error(f"Unexpected error in analyze_description: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"설명 분석 중 알 수 없는 오류가 발생했습니다: {str(e)}")

# uvicorn image_analysis.main:app --reload