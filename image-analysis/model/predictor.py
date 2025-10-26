from PIL import Image
import torch
from .loader import get_model, get_processor
from typing import List, Dict
import os

def predict(image_path: str, labels: List[str] = None) -> List[Dict[str, any]]:
    """
    주어진 이미지 경로를 기반으로 이미지 분류를 수행합니다.
    'labels' 인자는 더 이상 사용되지 않지만 API 호환성을 위해 유지됩니다.

    Args:
        image_path (str): 분석할 이미지의 파일 경로.
        labels (List[str], optional): 무시됩니다. Defaults to None.

    Returns:
        List[Dict[str, any]]: 상위 5개 예측 키워드와 확률을 담은 딕셔너리 리스트.
    """
    model = get_model()
    processor = get_processor()

    if not model or not processor:
        raise RuntimeError("Model is not loaded. Please load the model before running prediction.")

    try:
        image = Image.open(image_path)
    except FileNotFoundError:
        raise FileNotFoundError(f"Image file not found at {image_path}")

    # 이미지를 모델이 이해할 수 있는 형태로 전처리
    inputs = processor(images=image, return_tensors="pt")

    # 모델을 통해 예측 수행
    with torch.no_grad():
        outputs = model(**inputs)
    
    logits = outputs.logits
    
    # 로짓을 확률로 변환
    probabilities = torch.nn.functional.softmax(logits, dim=-1)[0]
    
    # Determine the number of top results to return, ensuring it doesn't exceed the number of classes
    num_classes = len(model.config.id2label)
    k = min(5, num_classes)
    
    # Get the top k predictions
    topk_probs, topk_indices = torch.topk(probabilities, k)
    
    results = []
    for i in range(topk_probs.size(0)):
        prob = topk_probs[i].item()
        idx = topk_indices[i].item()
        keyword = model.config.id2label[idx]
        results.append({"keyword": keyword, "probability": prob})
        
    return results

def predict_multiple(image_paths: List[str]) -> List[Dict[str, any]]:
    """
    여러 이미지 경로를 받아 각각을 분석하고, 각 이미지별로 top-1 예측 결과를 반환합니다.

    Args:
        image_paths (List[str]): 분석할 이미지들의 파일 경로 리스트.

    Returns:
        List[Dict[str, any]]: 각 이미지의 top-1 예측 키워드와 확률을 담은 딕셔너리 리스트.
    """
    model = get_model()
    processor = get_processor()

    if not model or not processor:
        raise RuntimeError("Model is not loaded. Please load the model before running prediction.")
    
    # 이 파일의 위치를 기준으로 프로젝트 루트 디렉토리를 계산합니다.
    # predictor.py -> model -> image-analysis -> project-root
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    
    results = []
    
    for image_path in image_paths:
        absolute_path = None
        try:
            # 경로 앞의 슬래시 제거 (절대 경로 방지)
            cleaned_path = image_path.lstrip('/')
            
            # 백엔드에서 받은 상대 경로와 프로젝트 루트를 조합하여 절대 경로를 생성합니다.
            # "backend/" 접두사가 없으면 추가
            if not cleaned_path.startswith('backend/'):
                cleaned_path = f'backend/{cleaned_path}'
            
            absolute_path = os.path.join(PROJECT_ROOT, cleaned_path)
            print(f"[DEBUG] 이미지 경로: {image_path} → {absolute_path}")
            
            image = Image.open(absolute_path)
        except FileNotFoundError:
            # 이미지를 찾을 수 없는 경우, 어떤 경로에서 파일을 찾을 수 없었는지 로그를 남깁니다.
            print(f"Warning: Image file not found at {absolute_path or image_path}, skipping.")
            continue

        inputs = processor(images=image, return_tensors="pt")

        with torch.no_grad():
            outputs = model(**inputs)
        
        logits = outputs.logits
        probabilities = torch.nn.functional.softmax(logits, dim=-1)[0]

        # 가장 높은 확률의 카테고리 선택 (top-1)
        top_prob, top_idx = torch.max(probabilities, dim=0)
        keyword = model.config.id2label[top_idx.item()]
        
        # 각 이미지의 top-1 결과 추가
        results.append({
            "keyword": keyword, 
            "probability": top_prob.item()
        })
        
        print(f"[DEBUG] 이미지 분석 결과: {keyword} (신뢰도: {top_prob.item():.2%})")
        
    return results