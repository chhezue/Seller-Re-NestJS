import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../components/HomePage.css';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  viewCount?: number;
  updatedAt?: string;
  createdAt: string;
  tradeType: 'SELL' | 'SHARE';
  condition: 'NEW' | 'LIKE_NEW' | 'USED' | 'FOR_PARTS';
}

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animate, setAnimate] = useState(false);

  const categories = ['전자기기', '가구/인테리어', '유아용품', '생활가전', '의류', '기타'];

  useEffect(() => {
    setAnimate(true);
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3000/api/product');
      const data = await response.json();

      if (response.ok && Array.isArray(data.products)) {
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

  const tradeTypeLabel = (type: Product['tradeType']) =>
    type === 'SELL' ? '판매 상품' : '나눔 상품';

  const conditionLabel = (condition: Product['condition']) => {
    switch (condition) {
      case 'NEW': return '새상품';
      case 'LIKE_NEW': return '사용감 적음';
      case 'USED': return '중고';
      case 'FOR_PARTS': return '사용감 많음';
      default: return '';
    }
  };

  return (
    <div className={`main-container ${animate ? 'fade-in' : ''}`}>
      <div className="main-homepage">
        <div className="main-categories">
          {categories.map((category, index) => (
            <button key={index} className="category-btn">{category}</button>
          ))}
        </div>

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
                  <div className="item-title-row">
                    <span className={`tag condition ${item.condition.toLowerCase()} inline-tag`}>
                      {conditionLabel(item.condition)}
                    </span>
                    <h3>{item.name}</h3>
                  </div>

                  <p className="price-info">{item.price.toLocaleString()}원</p>

                  <p className="extra-info">
                    👁 {item.viewCount ?? 0}회 | {getDisplayTime(item.updatedAt, item.createdAt)}
                    <span className="item-tags-inline">
                      <span className={`tag trade ${item.tradeType === 'SELL' ? 'sell' : 'share'}`}>
                        {tradeTypeLabel(item.tradeType)}
                      </span>
                    </span>
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
