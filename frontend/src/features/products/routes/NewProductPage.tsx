import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './NewProductPage.css';

// Enum 정의
enum PRODUCT_STATUS {
  ON_SALE = 'ON_SALE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
}

enum TRADE_TYPE {
  SELL = 'SELL',
  SHARE = 'SHARE',
}

enum PRODUCT_CONDITION {
  NEW = 'NEW',
  LIKE_NEW = 'LIKE_NEW',
  USED = 'USED',
  FOR_PARTS = 'FOR_PARTS',
}

// 한글 매핑 객체
const statusLabels: Record<PRODUCT_STATUS, string> = {
  ON_SALE: '판매중',
  RESERVED: '예약중',
  SOLD: '판매완료'
};

const tradeTypeLabels: Record<TRADE_TYPE, string> = {
  SELL: '판매',
  SHARE: '나눔'
};

const conditionLabels: Record<PRODUCT_CONDITION, string> = {
  NEW: '새 상품',
  LIKE_NEW: '사용감 적음',
  USED: '중고',
  FOR_PARTS: '사용감 많음'
};

const NewProductPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const categories = [
    { id: "12baa412-1840-4c8c-b7f6-abe92ef6abdb", name: "디지털기기" },
    { id: "820cc9c6-881d-436f-8209-f93713f45db6", name: "생활가전" },
    { id: "6e204078-bdd2-4485-9a11-30133fa445d1", name: "가구/인테리어" },
    { id: "55730a45-4c1f-45bf-9333-400415071321", name: "생활/주방" },
    { id: "027d14de-42e0-4fdd-a901-d722769fc9e9", name: "유아동" },
    { id: "0a24654e-1af7-477e-998d-0a2927d41808", name: "유아도서" },
    { id: "85a670b0-1a66-4cd5-aeb9-9b7c46566daf", name: "여성의류" },
    { id: "b1f6c45c-766f-48ad-b138-ad50757442a9", name: "여성잡화" },
    { id: "2bbc8cdc-ecc4-4b4e-baaf-446d11f04d20", name: "남성패션/잡화" },
    { id: "5c884485-6a1d-4791-9c8a-03c719a21e18", name: "뷰티/미용" }
  ];

  const [categoryId, setCategoryId] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [status, setStatus] = useState<PRODUCT_STATUS>(PRODUCT_STATUS.ON_SALE);
  const [tradeType, setTradeType] = useState<TRADE_TYPE>(TRADE_TYPE.SELL);
  const [condition, setCondition] = useState<PRODUCT_CONDITION>(PRODUCT_CONDITION.USED);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages(selectedFiles);
      const previewUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewImages(previewUrls);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || price <= 0 || !description || !categoryId) {
      setErrorMessage('모든 항목을 입력하세요. (카테고리 포함)');
      return;
    }

    const productData = {
      name: title,
      description,
      categoryId,
      price,
      status,
      tradeType,
      condition,
      isNegotiable
    };

    console.log('전송할 JSON 데이터:', productData);

    try {
      const response = await fetch('http://127.0.0.1:3000/api/product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      if (response.ok) {
        alert('상품 등록 성공!');
        navigate('/homepage');
      } else {
        const errorText = await response.text();
        console.error('등록 실패 상태:', response.status);
        console.error('등록 실패 메시지:', errorText);
        setErrorMessage(`상품 등록 실패: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('등록 중 오류:', error);
      setErrorMessage('서버 오류. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <div className="new-product-page">
      <div className="left-panel">
        <h3>이미지 등록</h3>
        <input type="file" accept="image/*" multiple onChange={handleImageChange} />
        <div className="preview-container">
          {previewImages.map((src, idx) => (
            <img key={idx} src={src} alt={`preview-${idx}`} className="preview-image" />
          ))}
        </div>
      </div>

      <div className="right-panel">
        <h2>상품 등록</h2>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <form className="product-form" onSubmit={handleSubmit}>
          <label>상품명
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="price-row">
            <label className="price-label">
              가격 (원)
              <input
                type="text"
                value={price ? price.toLocaleString() : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '');
                  const num = Number(raw);
                  setPrice(isNaN(num) ? 0 : num);
                }}
                placeholder="가격을 입력하세요"
              />
            </label>

            <label className="custom-checkbox-inline">
              <input
                type="checkbox"
                checked={isNegotiable}
                onChange={(e) => setIsNegotiable(e.target.checked)}
              />
              <span className="checkmark"></span>
              가격 제안 받기
            </label>
          </div>

          <div className="price-buttons">
            {[10000, 50000, 100000].map((val) => (
              <button key={val} type="button" onClick={() => setPrice(prev => prev + val)}>
                +{val.toLocaleString()}원
              </button>
            ))}
          </div>

          <label>설명
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label>카테고리 선택
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">-- 선택 --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </label>

          <label>상품 상태
            <select value={condition} onChange={(e) => setCondition(e.target.value as PRODUCT_CONDITION)}>
              {Object.entries(conditionLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>

          <label>거래 방식
            <select value={tradeType} onChange={(e) => setTradeType(e.target.value as TRADE_TYPE)}>
              {Object.entries(tradeTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>

          <label>판매 상태
            <select value={status} onChange={(e) => setStatus(e.target.value as PRODUCT_STATUS)}>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>

          <button type="submit">등록하기</button>
        </form>
        <p className="category-id">(선택된 카테고리 ID: <strong>{categoryId || '없음'}</strong>)</p>
      </div>
    </div>
  );
};

export default NewProductPage;
