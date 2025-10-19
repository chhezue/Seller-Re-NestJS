from PIL import Image
import torch
from .loader import get_model, get_processor
from typing import List, Dict
from collections import defaultdict
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
    여러 이미지 경로를 받아 각각을 분석하고, 모든 분석 결과의 확률을 평균내어
    가장 확률이 높은 상위 2개의 키워드를 반환합니다.

    Args:
        image_paths (List[str]): 분석할 이미지들의 파일 경로 리스트.

    Returns:
        List[Dict[str, any]]: 상위 2개 예측 키워드와 평균 확률을 담은 딕셔너리 리스트.
    """
    model = get_model()
    processor = get_processor()

    if not model or not processor:
        raise RuntimeError("Model is not loaded. Please load the model before running prediction.")

    aggregated_probs = defaultdict(float)
    
    # 이 파일의 위치를 기준으로 프로젝트 루트 디렉토리를 계산합니다.
    # predictor.py -> model -> image-analysis -> project-root
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    
    processed_image_count = 0
    for image_path in image_paths:
        absolute_path = None
        try:
            # 백엔드에서 받은 상대 경로와 프로젝트 루트를 조합하여 절대 경로를 생성합니다.
            absolute_path = os.path.join(PROJECT_ROOT, image_path)
            image = Image.open(absolute_path)
            processed_image_count += 1
        except FileNotFoundError:
            # 이미지를 찾을 수 없는 경우, 어떤 경로에서 파일을 찾을 수 없었는지 로그를 남깁니다.
            print(f"Warning: Image file not found at {absolute_path or image_path}, skipping.")
            continue

        inputs = processor(images=image, return_tensors="pt")

        with torch.no_grad():
            outputs = model(**inputs)
        
        logits = outputs.logits
        probabilities = torch.nn.functional.softmax(logits, dim=-1)[0]

        # 모든 레이블에 대한 확률을 집계합니다.
        for i, prob in enumerate(probabilities):
            keyword = model.config.id2label[i]
            aggregated_probs[keyword] += prob.item()

    # 집계된 확률의 평균을 계산합니다.
    if processed_image_count > 0:
        for keyword in aggregated_probs:
            aggregated_probs[keyword] /= processed_image_count

    # 집계된 확률을 기준으로 정렬합니다.
    sorted_results = sorted(aggregated_probs.items(), key=lambda item: item[1], reverse=True)
    
    # 상위 2개 결과를 선택합니다.
    top_2 = sorted_results[:2]
    
    # 최종 결과를 형식에 맞게 변환합니다.
    final_results = [{"keyword": keyword, "probability": prob} for keyword, prob in top_2]
        
    return final_results