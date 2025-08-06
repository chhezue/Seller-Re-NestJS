import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../components/HomePage.css';
import ProductFilters from '../components/ProductFilters'; // 카테고리 컴포넌트 추가

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  viewCount?: number;
  updatedAt?: string;
  createdAt: string;
  tradeType: string; // 변경! 유연하게
}

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animate, setAnimate] = useState(false);
  const hasFetched = useRef(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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
        console.log('받은 매물 데이터:', data.products);
        setProducts(data.products);
      } else {
        setError('매물 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('GET 오류:', err);
      setError('서버 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className={`main-container ${animate ? 'fade-in' : ''}`}>
      <div className="main-homepage">
        <ProductFilters onCategorySelect={(id) => setSelectedCategory(id)} />

        {loading ? (
          <p className="loading-text">로딩 중...</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : (
          <div className="main-items">
            {products.map((item) => (
              <Link to={`/item/${item.id}`} key={item.id} className="item-card">
                <img src={item.imageUrl || '/images/default.jpg'} alt={item.name} />
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
  );
};

export default HomePage;
