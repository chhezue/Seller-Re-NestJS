
import os
from model.loader import load_model
from model.predictor import predict

def test_model_predictions():
    """
    테스트 이미지에 대한 모델 예측을 수행하고 결과를 출력합니다.
    """
    # 모델 로드
    load_model()

    # 테스트 이미지 경로
    test_image_dir = "test_picture"
    image_files = ["책_test.jpeg", "카메라_test.jpeg", "세탁기_test.jpeg"]

    # 사용 가능한 모든 레이블 (config.json 기반)
    # 실제 predict 함수는 이 인자를 무시하지만, API의 현재 정의를 따릅니다.
    labels = [] 

    for image_file in image_files:
        image_path = os.path.join(test_image_dir, image_file)
        
        print(f"--- Analyzing {image_path} ---")
        
        try:
            # 예측 수행
            results = predict(image_path, labels)
            
            # 결과 출력
            for result in results:
                print(f"Keyword: {result['keyword']}, Probability: {result['probability']:.4f}")
        
        except FileNotFoundError as e:
            print(e)
        except Exception as e:
            print(f"An error occurred: {e}")
        
        print("\n")

if __name__ == "__main__":
    test_model_predictions()
