import React, { useState } from 'react';
import './ProductFilters.css';

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

const ProductFilters: React.FC<{ onCategorySelect: (categoryId: string) => void }> = ({ onCategorySelect }) => {
  const [selectedId, setSelectedId] = useState<string>('');

  const handleClick = (id: string) => {
    setSelectedId(id);
    onCategorySelect(id);
  };

  return (
    <div className="category-wrapper">
      <h3 className="category-title">카테고리</h3> {/* ✅ 추가된 제목 */}
      <div className="category-bar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-button ${selectedId === cat.id ? 'selected' : ''}`}
            onClick={() => handleClick(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductFilters;
