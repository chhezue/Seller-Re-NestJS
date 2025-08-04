import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './NewProductPage.css';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const NewProductPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const [categoryId] = useState(generateUUID());
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [status, setStatus] = useState<'ON_SALE' | 'SOLD_OUT'>('ON_SALE');
  const [tradeType, setTradeType] = useState<'SELL' | 'BUY'>('SELL');
  const [condition, setCondition] = useState<'NEW' | 'USED'>('USED');

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

    if (!title || !price || !description || images.length === 0) {
      setErrorMessage('모든 항목을 입력하고 이미지를 선택하세요.');
      return;
    }

    const formData = new FormData();
    formData.append('name', title);
    formData.append('description', description);
    formData.append('categoryId', categoryId);
    formData.append('price', price);
    formData.append('status', status);
    formData.append('tradeType', tradeType);
    formData.append('condition', condition);
    formData.append('isNegotiable', String(isNegotiable));
    images.forEach((img, index) => {
      formData.append(`image${index}`, img);
    });

    try {
      const response = await fetch('http://127.0.0.1:3000/api/products', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('상품 등록 성공!');
        navigate('/homepage');
      } else {
        setErrorMessage('상품 등록 실패. 다시 시도해주세요.');
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
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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


          <label>설명
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label>상품 상태
            <select value={condition} onChange={(e) => setCondition(e.target.value as 'NEW' | 'USED')}>
              <option value="NEW">새상품</option>
              <option value="USED">중고</option>
            </select>
          </label>

          <label>거래 방식
            <select value={tradeType} onChange={(e) => setTradeType(e.target.value as 'SELL' | 'BUY')}>
              <option value="SELL">판매</option>
              <option value="BUY">구매</option>
            </select>
          </label>

          <label>판매 상태
            <select value={status} onChange={(e) => setStatus(e.target.value as 'ON_SALE' | 'SOLD_OUT')}>
              <option value="ON_SALE">판매중</option>
              <option value="SOLD_OUT">판매완료</option>
            </select>
          </label>

          <button type="submit">등록하기</button>
        </form>
        <p className="category-id">(참고) 카테고리 ID: <strong>{categoryId}</strong></p>
      </div>
    </div>
  );
};

export default NewProductPage;
