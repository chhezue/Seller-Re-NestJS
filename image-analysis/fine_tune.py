import torch
from datasets import load_dataset
from transformers import (
    ViTImageProcessor,
    ViTForImageClassification,
    TrainingArguments,
    Trainer,
)
import os
import numpy as np
import evaluate # 'datasets.load_metric' 대신 'evaluate' 사용

# --- 1. 설정 (Configuration) ---
# 사용자가 수정해야 할 부분
# -----------------------------------
# 데이터셋 경로 (train/validation 폴더가 있는 상위 폴더)
DATASET_PATH = "image-analysis/temp_dataset"
# 파인튜닝된 모델이 저장될 경로
MODEL_OUTPUT_PATH = "image-analysis/my_custom_model"
# 기반으로 할 사전학습 모델
PRETRAINED_MODEL = "google/vit-base-patch16-224"

# 학습 관련 하이퍼파라미터
NUM_TRAIN_EPOCHS = 10  # 전체 데이터셋을 몇 번 반복하여 학습할지 결정
PER_DEVICE_TRAIN_BATCH_SIZE = 32  # 한 번에 몇 개의 이미지를 학습할지 결정 (GPU 메모리에 따라 조절)
PER_DEVICE_EVAL_BATCH_SIZE = 32
LEARNING_RATE = 5e-5
# -----------------------------------

# 평가 지표 계산 함수
metric = evaluate.load("accuracy") # 'load_metric'은 deprecated 되었습니다.
def compute_metrics(p):
    return metric.compute(predictions=np.argmax(p.predictions, axis=1), references=p.label_ids)

def collate_fn(examples):
    """데이터 배치를 구성하는 함수"""
    pixel_values = torch.stack([example["pixel_values"] for example in examples])
    labels = torch.tensor([example["label"] for example in examples])
    return {"pixel_values": pixel_values, "labels": labels}


def main():
    """메인 학습 로직을 수행합니다."""
    
    print("--- 파인튜닝 스크립트 시작 ---")

    # --- 2. 데이터셋 로드 및 전처리 ---
    print(f"데이터셋을 '{DATASET_PATH}' 경로에서 로드합니다.")
    if not os.path.exists(DATASET_PATH) or not os.path.exists(os.path.join(DATASET_PATH, "train")) or not os.path.exists(os.path.join(DATASET_PATH, "validation")):
        print(f"오류: 데이터셋 경로 '{DATASET_PATH}'가 올바르지 않거나, 내부에 'train' 또는 'validation' 폴더가 없습니다.")
        print("스크립트 상단의 DATASET_PATH 변수를 수정하고, 해당 경로에 폴더를 준비해주세요.")
        return

    # ImageFolder 형식의 데이터셋 로드
    processor = ViTImageProcessor.from_pretrained(PRETRAINED_MODEL)
    
    def transform(example_batch):
        """데이터셋 전처리 함수"""
        inputs = processor([x.convert("RGB") for x in example_batch["image"]], return_tensors="pt")
        inputs["label"] = example_batch["label"]
        return inputs

    print("데이터셋을 로딩하고 전처리를 적용합니다...")
    train_dataset = load_dataset("imagefolder", data_dir=os.path.join(DATASET_PATH, "train"))["train"]
    eval_dataset = load_dataset("imagefolder", data_dir=os.path.join(DATASET_PATH, "validation"))["train"]

    train_dataset = train_dataset.with_transform(transform)
    eval_dataset = eval_dataset.with_transform(transform)
    
    print("\n로드된 데이터셋 정보:")
    print(train_dataset)
    print(eval_dataset)

    # 레이블 정보 추출
    labels = train_dataset.features["label"].names
    label2id = {label: i for i, label in enumerate(labels)}
    id2label = {i: label for i, label in enumerate(labels)}
    print(f"\n감지된 카테고리 (총 {len(labels)}개): {labels}")

    # --- 3. 모델 로드 ---
    print(f"\n사전 학습된 모델 '{PRETRAINED_MODEL}'을 로드합니다.")
    model = ViTForImageClassification.from_pretrained(
        PRETRAINED_MODEL,
        num_labels=len(labels),
        label2id=label2id,
        id2label=id2label,
        ignore_mismatched_sizes=True, # 사전학습된 모델의 분류층과 크기가 다른 것을 무시하고 새로 초기화
    )
    print("모델 로드가 완료되었습니다.")

    # --- 4. 학습 설정 및 실행 ---
    print("\n학습을 위한 Trainer를 설정합니다.")
    
    training_args = TrainingArguments(
        output_dir=MODEL_OUTPUT_PATH,
        num_train_epochs=NUM_TRAIN_EPOCHS,
        learning_rate=LEARNING_RATE,
        per_device_eval_batch_size=PER_DEVICE_EVAL_BATCH_SIZE,

        logging_dir=f"{MODEL_OUTPUT_PATH}/logs",
        remove_unused_columns=False,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        data_collator=collate_fn,
        compute_metrics=compute_metrics,
        tokenizer=processor,
    )

    print("\n--- 학습 시작 ---")
    trainer.train()
    print("--- 학습 완료 ---")

    # --- 5. 모델 및 프로세서 저장 ---
    print(f"\n학습된 모델과 프로세서를 '{MODEL_OUTPUT_PATH}' 경로에 저장합니다.")
    trainer.save_model(MODEL_OUTPUT_PATH)
    processor.save_pretrained(MODEL_OUTPUT_PATH)
    print("저장이 완료되었습니다. 이제 'loader.py'에서 이 경로를 사용하여 모델을 로드할 수 있습니다.")
    print("--- 파인튜닝 스크립트 종료 ---")


if __name__ == "__main__":
    main()