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