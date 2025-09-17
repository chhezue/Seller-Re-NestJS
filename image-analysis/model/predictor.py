from PIL import Image
import torch
from .loader import get_model, get_processor
from typing import List, Dict

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
    
    # 상위 5개 예측 추출
    top5_probs, top5_indices = torch.topk(probabilities, 5)
    
    results = []
    for i in range(top5_probs.size(0)):
        prob = top5_probs[i].item()
        idx = top5_indices[i].item()
        keyword = model.config.id2label[idx]
        results.append({"keyword": keyword, "probability": prob})
        
    return results