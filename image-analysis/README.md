# 이미지 분석 API 서버

NestJS 백엔드로부터 이미지 분석 요청을 받아, AI 모델을 통해 이미지의 카테고리와 품목명을 추론하여 반환하는 FastAPI 기반의 파이썬 서버입니다.

## 요구사항

- Python 3.9 이상

## 1. 설치 방법

프로젝트 루트 디렉토리에서 아래의 명령어를 순서대로 실행하세요.

**1.1. 가상환경 생성**

```bash
python3 -m venv image-analysis/venv
```

**1.2. 필요 라이브러리 설치**

`image-analysis` 폴더에 생성된 `requirements.txt` 파일을 이용하여 모든 의존성을 한 번에 설치합니다.

```bash
image-analysis/venv/bin/pip install -r image-analysis/requirements.txt
```

## 2. 서버 실행 방법

서버를 실행하려면 `image-analysis` 폴더 안에서 `uvicorn` 명령어를 사용합니다.

```bash
# image-analysis 폴더로 이동
cd image-analysis

# 서버 실행 (개발용)
../venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

- `--host 0.0.0.0`: 외부(예: NestJS 컨테이너)에서 접근 가능하도록 설정합니다.
- `--port 8001`: 서버가 8001번 포트를 사용하도록 설정합니다.
- `--reload`: 코드 변경 시 서버가 자동으로 재시작되어 개발에 편리합니다.

서버가 성공적으로 실행되면, AI 모델을 로드한 후 `http://0.0.0.0:8001`에서 요청을 기다립니다.

## 3. API 명세

### `POST /analyze`

이미지를 분석하여 관련된 키워드와 확률을 반환합니다.

**Request Body:**

```json
{
  "image_path": "/path/to/your/image.jpg",
  "labels": ["키워드1", "키워드2", "키워드3"]
}
```

**Example `curl` command:**

```bash
curl -X POST "http://localhost:8001/analyze" \
-H "Content-Type: application/json" \
-d 
{
    "image_path": "/Users/kimgyejeong/Desktop/repos/Seller-Re-NestJS/backend/uploads_temp/1F3581DB-39C9-4CB5-B861-BC108982640E_1_105_c.jpeg",
    "labels": ["도서", "인형", "유아동"]
}
```

**Success Response (200 OK):**

```json
{
  "results": [
    {
      "keyword": "도서",
      "probability": 0.3074592351913452
    },
    {
      "keyword": "인형",
      "probability": 0.18687690794467926
    },
    {
      "keyword": "유아동",
      "probability": 0.10409323871135712
    }
  ]
}
```
