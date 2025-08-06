import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../components/HomePage.css';
import ProductFilters from '../components/ProductFilters'; // 형태 유지용
import ProductSearch from '../components/ProductSearch';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  viewCount?: number;
  updatedAt?: string;
  createdAt: string;
  tradeType: string;
  status: string;
  // ❌ categoryId 없음 (데이터 기준)
}

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animate, setAnimate] = useState(false);
  const hasFetched = useRef(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  useEffect(() => {
    setAnimate(true);
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchProducts();
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3000/api/product');
      const data = await response.json();
      if (response.ok && Array.isArray(data.products)) {
       // console.log('매물 데이터:', data.products);
        setProducts(data.products);
      } else {
        setError('매물 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
     // console.error('GET 오류:', err);
      setError('서버 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
  };

  const filteredProducts = products.filter((product) => {
    const matchesKeyword = searchKeyword
      ? product.name.toLowerCase().includes(searchKeyword.toLowerCase())
      : true;
    return matchesKeyword;
  });

  const formatRelativeTime = (isoDate?: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    return `${diffDay}일 전`;
  };

  const getDisplayTime = (updatedAt?: string, createdAt?: string) => {
    const baseTime = updatedAt || createdAt;
    return formatRelativeTime(baseTime);
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'RESERVED') return <div className="status-badge reserved">예약중</div>;
    if (status === 'SOLD') return <div className="status-badge sold">판매완료</div>;
    return null;
  };

  return (
    <div className={`main-container ${animate ? 'fade-in' : ''}`}>
      <div className="main-homepage">
        <ProductSearch onSearch={handleSearch} />

        <div className="content-layout">
          {/* 왼쪽 필터 제목 + 카테고리 UI (비어있어도 형태 유지 가능) */}
          <div className="sidebar">
            <h3 className="filter-title">필터</h3>
            <ProductFilters onCategorySelect={() => {}} />
          </div>

          <div className="main-content">
            {loading ? (
              <p className="loading-text">로딩 중...</p>
            ) : error ? (
              <p className="error-text">{error}</p>
            ) : (
              <div className="main-items">
                {filteredProducts.map((item) => (
                  <Link to={`/item/${item.id}`} key={item.id} className="item-card">
                    <div className="image-wrapper">
                      {renderStatusBadge(item.status)}
                      <img
                        src={item.imageUrl || '/images/default.jpg'}
                        alt={item.name}
                        className="product-image"
                      />
                    </div>
                    <div className="item-info">
                      <h3 className="truncate-text">{item.name}</h3>
                      <p className="price-info">
                        {item.tradeType === 'SHARE' ? '나눔' : `${item.price.toLocaleString()}원`}
                      </p>
                      <p className="extra-info">
                        👁 {item.viewCount ?? 0}회 | {getDisplayTime(item.updatedAt, item.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
