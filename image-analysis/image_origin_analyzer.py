from PIL import Image
from PIL.ExifTags import TAGS

def analyze_image_origin(image_path: str) -> dict:
    """
    이미지 메타데이터를 분석하여 AI 생성, 인터넷 다운로드, 사용자 촬영 여부를 점수화합니다.
    """
    score = 0
    origin_likelihood = {
        "user_taken": 0,
        "internet_download": 0,
        "ai_generated": 0
    }

    try:
        with Image.open(image_path) as img:
            exif_data = img._getexif()

            if exif_data:
                score += 30  # EXIF 데이터 존재
                origin_likelihood["user_taken"] += 0.4
                origin_likelihood["internet_download"] += 0.2

                decoded_exif = {TAGS.get(tag, tag): value for tag, value in exif_data.items()}

                # 카메라 제조사 및 모델
                if "Make" in decoded_exif and "Model" in decoded_exif:
                    score += 20
                    origin_likelihood["user_taken"] += 0.3

                # 촬영 날짜/시간
                if "DateTimeOriginal" in decoded_exif:
                    score += 15
                    origin_likelihood["user_taken"] += 0.2

                # GPS 정보
                if "GPSInfo" in decoded_exif:
                    score += 25
                    origin_likelihood["user_taken"] += 0.5

                # 소프트웨어 정보
                if "Software" in decoded_exif:
                    software = str(decoded_exif["Software"]).lower()
                    if any(ai_keyword in software for ai_keyword in ["stable diffusion", "midjourney", "dall-e", "ai generated"]):
                        score -= 50
                        origin_likelihood["ai_generated"] += 0.8
                        origin_likelihood["user_taken"] -= 0.3
                    elif any(edit_keyword in software for edit_keyword in ["photoshop", "gimp"]):
                        score -= 10
                        origin_likelihood["internet_download"] += 0.3

            else:
                score -= 40  # EXIF 데이터 없음
                origin_likelihood["ai_generated"] += 0.6
                origin_likelihood["internet_download"] += 0.4

            # 파일 이름 분석 (간단한 예시)
            file_name = image_path.lower()
            if any(keyword in file_name for keyword in ["download", "unsplash", "pexels"]):
                score -= 5
                origin_likelihood["internet_download"] += 0.2

    except Exception as e:
        print(f"Error analyzing image {image_path}: {e}")
        return {"error": str(e)}

    # 점수를 기반으로 최종 분류
    if score >= 50:
        classification = "사용자 촬영 이미지"
    elif score >= 0:
        classification = "다운로드 이미지"
    else:
        classification = "AI 생성 이미지"

    # likelihood 정규화
    total_likelihood = sum(origin_likelihood.values())
    if total_likelihood > 0:
        for key in origin_likelihood:
            origin_likelihood[key] /= total_likelihood

    return {
        "score": score,
        "classification": classification,
        "likelihood": origin_likelihood,
        "details": "분석 완료"
    }

if __name__ == "__main__":
    # 테스트용 이미지 경로 (실제 이미지 경로로 변경해야 합니다)
    # 예시: image-analysis/test_picture/카메라_test.jpeg
    test_image_path_user = "/Users/kimgyejeong/Desktop/repos/Seller-Re-NestJS/image-analysis/test_picture/카메라_test.jpeg"
    test_image_path_ai = "/Users/kimgyejeong/Desktop/repos/Seller-Re-NestJS/image-analysis/test_picture/세탁기_test.jpeg" # EXIF 없는 이미지로 가정

    print(f"Analyzing {test_image_path_user}:")
    result_user = analyze_image_origin(test_image_path_user)
    print(result_user)

    print(f"\nAnalyzing {test_image_path_ai}:")
    result_ai = analyze_image_origin(test_image_path_ai)
    print(result_ai)
