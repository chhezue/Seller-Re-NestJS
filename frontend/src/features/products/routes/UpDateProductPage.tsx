import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './NewProductPage.css';

interface OptionItem {
  key: string;
  label: string;
}

interface EnumResponse {
  status: OptionItem[];
  tradeType: OptionItem[];
  condition: OptionItem[];
}

const UpDateProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
    { id: "6e204078-bdd2-4485-9a11-30133fa445d1", name: "가구/인터넷" },
    { id: "55730a45-4c1f-45bf-9333-400415071321", name: "생화/주방" },
    { id: "027d14de-42e0-4fdd-a901-d722769fc9e9", name: "유아동" },
    { id: "0a24654e-1af7-477e-998d-0a2927d41808", name: "유아도서" },
    { id: "85a670b0-1a66-4cd5-aeb9-9b7c46566daf", name: "여성의류" },
    { id: "b1f6c45c-766f-48ad-b138-ad50757442a9", name: "여성잡화" },
    { id: "2bbc8cdc-ecc4-4b4e-baaf-446d11f04d20", name: "남성패션/자화" },
    { id: "5c884485-6a1d-4791-9c8a-03c719a21e18", name: "뷰티/미용" }
  ];

  const [categoryId, setCategoryId] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [status, setStatus] = useState('ON_SALE');
  const [tradeType, setTradeType] = useState('SELL');
  const [condition, setCondition] = useState('USED');

  const [statusOptions, setStatusOptions] = useState<OptionItem[]>([]);
  const [tradeTypeOptions, setTradeTypeOptions] = useState<OptionItem[]>([]);
  const [conditionOptions, setConditionOptions] = useState<OptionItem[]>([]);

  const isShare = tradeType === 'SHARE';

  useEffect(() => {
    const fetchEnums = async () => {
      try {
        const response = await fetch('http://127.0.0.1:3000/api/product/enums');
        const data: EnumResponse = await response.json();

        setStatusOptions(data.status);
        setTradeTypeOptions(data.tradeType);
        setConditionOptions(data.condition);
      } catch (error) {
        console.error('옵션 불러오기 실패:', error);
        setErrorMessage('상품 옵션 정보를 불러오지 못했습니다.');
      }
    };

    fetchEnums();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:3000/api/product/${id}`);
        const product = await response.json();

        setTitle(product.name);
        setPrice(product.price);
        setDescription(product.description);
        setCategoryId(product.category.id); // 이 값이 categories 중 하나와 정확히 일치해야 선택됨
        setIsNegotiable(product.isNegotiable);
        setStatus(product.status);
        setTradeType(product.tradeType);
        setCondition(product.condition);
        if (product.imageUrl) {
          setPreviewImages([product.imageUrl]);
        }
      } catch (error) {
        console.error('상품 데이터 로드 실패:', error);
        setErrorMessage('상품 정보를 불러오지 못했습니다.');
      }
    };

    if (id) fetchProduct();
  }, [id]);

  useEffect(() => {
    if (isShare) {
      setPrice(0);
      setIsNegotiable(false);
    }
  }, [tradeType]);

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

    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch(`http://127.0.0.1:3000/api/product/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });

      if (response.ok) {
        alert('상품 수정 성공!');
        navigate(`/product/${id}`);
      } else {
        const errorText = await response.text();
        setErrorMessage(`상품 수정 실패: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('수정 중 오류:', error);
      setErrorMessage('서버 오류. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <div className="new-product-page">
      <div className="left-panel">
        <h3>이미지 수정</h3>
        <input type="file" accept="image/*" multiple onChange={handleImageChange} />
        <div className="preview-container">
          {previewImages.map((src, idx) => (
            <img key={idx} src={src} alt={`preview-${idx}`} className="preview-image" />
          ))}
        </div>
      </div>

      <div className="right-panel">
        <h2>상품 수정</h2>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <form className="product-form" onSubmit={handleSubmit}>
          <label>상품명
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

        <div className={`price-row ${tradeType === 'SHARE' ? 'disabled-section' : ''}`}>
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
                disabled={tradeType === 'SHARE'}  // 실제 입력 방지
                />
            </label>

            <label className="custom-checkbox-inline">
                <input
                type="checkbox"
                checked={isNegotiable}
                onChange={(e) => setIsNegotiable(e.target.checked)}
                disabled={tradeType === 'SHARE'}  // 제안 방지
                />
                <span className="checkmark"></span>
                가격 제안 받기
            </label>
        </div>

        {/* ✅ 추가된 가격 버튼들 */}
        <div className="price-buttons">
        {[10000, 50000, 100000].map((val) => (
            <button
            key={val}
            type="button"
            onClick={() => setPrice(prev => prev + val)}
            disabled={tradeType === 'SHARE'}
            >
            +{val.toLocaleString()}원
            </button>
        ))}
        </div>

          <label>설명
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label>카테고리 선택
            <select value={String(categoryId)} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">-- 선택 --</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
            </select>
          </label>

          <label>상품 상태
            <select value={condition} onChange={(e) => setCondition(e.target.value)}>
              {conditionOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label>거래 방식
            <select value={tradeType} onChange={(e) => setTradeType(e.target.value)}>
              {tradeTypeOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label>판매 상태
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statusOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </label>

          <button type="submit">수정하기</button>
        </form>
      </div>
    </div>
  );
};

export default UpDateProductPage;