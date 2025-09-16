from PIL import Image
import torch
from .loader import get_model, get_processor
from typing import List, Dict

def predict(image_path: str, labels: List[str]) -> List[Dict[str, any]]:
    """
    주어진 이미지 경로와 레이블 목록을 기반으로 분석을 수행합니다.

    Args:
        image_path (str): 분석할 이미지의 파일 경로.
        labels (List[str]): 후보 키워드 목록.

    Returns:
        List[Dict[str, any]]: 키워드와 확률을 담은 딕셔너리 리스트.
    """
    model = get_model()
    processor = get_processor()

    if not model or not processor:
        raise RuntimeError("Model is not loaded. Please load the model before running prediction.")

    try:
        image = Image.open(image_path)
    except FileNotFoundError:
        raise FileNotFoundError(f"Image file not found at {image_path}")

    # 프롬프트 엔지니어링: 각 레이블을 더 설명적인 문구로 변환
    templated_labels = [f"a photo of a {label}" for label in labels]
    # 이미지와 텍스트(키워드)를 모델이 이해할 수 있는 형태로 전처리
    inputs = processor(text=templated_labels, images=image, return_tensors="pt", padding=True)

    # 모델을 통해 이미지와 텍스트 간의 관련성 점수(logits) 추론
    with torch.no_grad():
        outputs = model(**inputs)
    
    logits_per_image = outputs.logits_per_image
    # 점수를 확률로 변환
    probs = logits_per_image.softmax(dim=1)

    # 각 키워드와 확률을 짝지어 리스트 생성
    results = [{"keyword": label, "probability": prob.item()} for label, prob in zip(labels, probs[0])]
    
    # 확률이 높은 순으로 정렬
    sorted_results = sorted(results, key=lambda x: x["probability"], reverse=True)
    
    return sorted_results
