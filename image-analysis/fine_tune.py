import torch
from datasets import load_dataset, Dataset
from transformers import (
    ViTImageProcessor,
    ViTForImageClassification,
    TrainingArguments,
    Trainer,
)
import os
import numpy as np
import evaluate
from glob import glob
from PIL import Image

# --- 1. 설정 (Configuration) ---
# -----------------------------------
MODEL_OUTPUT_PATH = "my_custom_model_v2"
PRETRAINED_MODEL = "google/vit-base-patch16-224"

NUM_TRAIN_EPOCHS = 10
PER_DEVICE_TRAIN_BATCH_SIZE = 32
PER_DEVICE_EVAL_BATCH_SIZE = 32
LEARNING_RATE = 5e-5
# -----------------------------------

metric = evaluate.load("accuracy")
def compute_metrics(p):
    return metric.compute(predictions=np.argmax(p.predictions, axis=1), references=p.label_ids)

import torchvision.transforms as T

# --- 1. 설정 (Configuration) ---
# -----------------------------------
MODEL_OUTPUT_PATH = "my_custom_model_v2"
PRETRAINED_MODEL = "google/vit-base-patch16-224"

NUM_TRAIN_EPOCHS = 15 # 에포크 증가
PER_DEVICE_TRAIN_BATCH_SIZE = 32
PER_DEVICE_EVAL_BATCH_SIZE = 32
LEARNING_RATE = 3e-5 # 학습률 감소
# -----------------------------------

metric = evaluate.load("accuracy")
def compute_metrics(p):
    return metric.compute(predictions=np.argmax(p.predictions, axis=1), references=p.label_ids)

def collate_fn(examples):
    pixel_values = torch.stack([example["pixel_values"] for example in examples])
    labels = torch.tensor([example["label"] for example in examples])
    return {"pixel_values": pixel_values, "labels": labels}

def create_dataset_from_path(data_path):
    """주어진 경로에서 이미지 경로와 레이블을 수동으로 찾아 데이터셋을 생성합니다."""
    image_paths = []
    labels = []
    
    if not os.path.exists(data_path):
        return None, {}

    class_names = sorted([os.path.basename(d) for d in glob(os.path.join(data_path, "*")) if os.path.isdir(d)])
    label2id = {name: i for i, name in enumerate(class_names)}

    for class_name in class_names:
        class_id = label2id[class_name]
        class_path = os.path.join(data_path, class_name)
        for ext in ["*.jpg", "*.jpeg", "*.png", "*.gif", "*.bmp"]:
            for img_path in glob(os.path.join(class_path, ext)):
                image_paths.append(img_path)
                labels.append(class_id)

    return Dataset.from_dict({"image": image_paths, "label": labels}), label2id

def main():
    """메인 학습 로직을 수행합니다."""
    
    print("--- 파인튜닝 스크립트 시작 ---")

    # --- 2. 데이터셋 로드 및 전처리 ---
    print("데이터셋을 로드합니다.")

    processor = ViTImageProcessor.from_pretrained(PRETRAINED_MODEL)

    # 데이터 증강 및 전처리 파이프라인 정의
    normalize = T.Normalize(mean=processor.image_mean, std=processor.image_std)
    train_transforms = T.Compose([
        T.Lambda(lambda img: img.convert("RGB") if img.mode != "RGB" else img),
        T.RandomResizedCrop(processor.size["height"]),
        T.RandomHorizontalFlip(),
        T.ToTensor(),
        normalize,
    ])
    val_transforms = T.Compose([
        T.Lambda(lambda img: img.convert("RGB") if img.mode != "RGB" else img),
        T.Resize(processor.size["height"]),
        T.CenterCrop(processor.size["height"]),
        T.ToTensor(),
        normalize,
    ])

    def train_transform(example_batch):
        """학습 데이터셋 전처리"""
        example_batch["pixel_values"] = [train_transforms(Image.open(path)) for path in example_batch["image"]]
        return example_batch

    def val_transform(example_batch):
        """검증 데이터셋 전처리"""
        example_batch["pixel_values"] = [val_transforms(Image.open(path)) for path in example_batch["image"]]
        return example_batch

    print("데이터셋을 수동으로 생성하고 전처리를 적용합니다...")
    train_dataset, label2id = create_dataset_from_path("dataset/train")
    eval_dataset, _ = create_dataset_from_path("dataset/validation")

    if train_dataset is None or eval_dataset is None:
        print("오류: 학습 또는 검증 데이터셋을 생성하지 못했습니다. 경로를 확인해주세요.")
        return

    id2label = {i: label for label, i in label2id.items()}
    labels = list(label2id.keys())

    train_dataset = train_dataset.map(train_transform, batched=True, remove_columns=['image'])
    eval_dataset = eval_dataset.map(val_transform, batched=True, remove_columns=['image'])
    
    print("\n생성된 데이터셋 정보:")
    print(train_dataset)
    print(eval_dataset)
    print(f"\n감지된 카테고리 (총 {len(labels)}개): {labels}")

    # --- 3. 모델 로드 ---
    print(f"\n사전 학습된 모델 '{PRETRAINED_MODEL}'을 로드합니다.")
    model = ViTForImageClassification.from_pretrained(
        PRETRAINED_MODEL,
        num_labels=len(labels),
        label2id=label2id,
        id2label=id2label,
        ignore_mismatched_sizes=True,
    )
    print("모델 로드가 완료되었습니다.")

    # --- 4. 학습 설정 및 실행 ---
    print("\n학습을 위한 Trainer를 설정합니다.")
    
    training_args = TrainingArguments(
        output_dir=MODEL_OUTPUT_PATH,
        num_train_epochs=NUM_TRAIN_EPOCHS,
        learning_rate=LEARNING_RATE,
        per_device_train_batch_size=PER_DEVICE_TRAIN_BATCH_SIZE,
        per_device_eval_batch_size=PER_DEVICE_EVAL_BATCH_SIZE,
        logging_dir=f"{MODEL_OUTPUT_PATH}/logs",
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
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
    print("저장이 완료되었습니다.")
    print("--- 파인튜닝 스크립트 종료 ---")


if __name__ == "__main__":
    main()
