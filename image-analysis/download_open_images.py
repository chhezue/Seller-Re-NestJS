import fiftyone as fo
import fiftyone.zoo as foz
import os

# --- 설정 ---
CLASSES = ["Camera", "Book", "Washing machine"]
MAX_SAMPLES = 100 # 각 클래스당 다운로드할 최대 샘플 수
EXPORT_DIR = "dataset/train"
# ------------

def download_open_images():
    """Open Images 데이터셋에서 특정 클래스의 이미지를 다운로드합니다."""
    print(f"--- Open Images 다운로드 시작 ---")
    print(f"클래스: {CLASSES}")
    print(f"샘플 수: {MAX_SAMPLES} (각 클래스당)")

    # 데이터셋 로드 (필요 시 다운로드)
    dataset = foz.load_zoo_dataset(
        "open-images-v7",
        split="train",
        classes=CLASSES,
        max_samples=MAX_SAMPLES,
    )

    print(f"\n로드된 데이터셋 정보:")
    print(dataset)

    # positive_labels를 classification으로 변환
    dataset.add_sample_field("classification", fo.EmbeddedDocumentField, embedded_doc_type=fo.core.labels.Classification)
    for sample in dataset.iter_samples(autosave=True):
        if sample.positive_labels and sample.positive_labels.classifications:
            sample.classification = sample.positive_labels.classifications[0]

    # 데이터셋 내보내기 (이미지 다운로드)
    # classification 형식으로 내보내면 클래스 이름으로 된 하위 디렉토리에 이미지가 저장됩니다.
    print(f"\n이미지를 '{EXPORT_DIR}' 디렉토리로 내보냅니다...")
    if not os.path.exists(EXPORT_DIR):
        os.makedirs(EXPORT_DIR)

    dataset.export(
        export_dir=EXPORT_DIR,
        dataset_type=fo.types.ImageClassificationDirectoryTree,
        label_field="classification",
    )

    print("\n--- 다운로드 및 내보내기 완료 ---")

def download_open_images_validation():
    """Open Images 데이터셋에서 특정 클래스의 이미지를 다운로드합니다. (검증용)"""
    print(f"--- Open Images 다운로드 시작 (검증용) ---")
    print(f"클래스: {CLASSES}")
    print(f"샘플 수: 20 (각 클래스당)")

    # 데이터셋 로드 (필요 시 다운로드)
    dataset = foz.load_zoo_dataset(
        "open-images-v7",
        split="validation",
        classes=CLASSES,
        max_samples=20,
    )

    print(f"\n로드된 데이터셋 정보:")
    print(dataset)

    # positive_labels를 classification으로 변환
    dataset.add_sample_field("classification", fo.EmbeddedDocumentField, embedded_doc_type=fo.core.labels.Classification)
    for sample in dataset.iter_samples(autosave=True):
        if sample.positive_labels and sample.positive_labels.classifications:
            sample.classification = sample.positive_labels.classifications[0]

    # 데이터셋 내보내기 (이미지 다운로드)
    # classification 형식으로 내보내면 클래스 이름으로 된 하위 디렉토리에 이미지가 저장됩니다.
    print(f"\n이미지를 'dataset/validation_openimages' 디렉토리로 내보냅니다...")
    if not os.path.exists("dataset/validation_openimages"):
        os.makedirs("dataset/validation_openimages")

    dataset.export(
        export_dir="dataset/validation",
        dataset_type=fo.types.ImageClassificationDirectoryTree,
        label_field="classification",
    )

    print("\n--- 다운로드 및 내보내기 완료 (검증용) ---")

if __name__ == "__main__":
    download_open_images()
    download_open_images_validation()