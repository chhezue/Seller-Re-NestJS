from transformers import CLIPProcessor, CLIPModel
import torch

# 모델과 프로세서를 담을 변수. 서버 전체에서 공유됩니다.
model = None
processor = None

def load_model():
    """
    AI 모델과 프로세서를 로드하여 전역 변수에 할당합니다.
    서버 시작 시 한 번만 호출됩니다.
    """
    global model, processor
    
    # 사용할 모델 이름
    model_name = "openai/clip-vit-large-patch14"
    
    print(f"Loading model: {model_name}...")
    model = CLIPModel.from_pretrained(model_name)
    processor = CLIPProcessor.from_pretrained(model_name)
    print("Model loaded successfully.")

def get_model():
    return model

def get_processor():
    return processor
