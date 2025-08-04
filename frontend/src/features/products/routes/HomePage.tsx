import React from 'react';
import { Link } from 'react-router-dom';
import '../components/HomePage.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlusCircle, faUser } from '@fortawesome/free-solid-svg-icons';

const sampleItems = [
  {
    id: 1,
    title: '아이폰 14 Pro Max',
    price: '1,300,000원',
    image: '/images/sample1.jpg'
  },
  {
    id: 2,
    title: '중고 전자렌지',
    price: '30,000원',
    image: '/images/sample2.jpg'
  },
  {
    id: 3,
    title: '캠핑용 의자 2개',
    price: '20,000원',
    image: '/images/sample3.jpg'
  }
];

const HomePage: React.FC = () => {
  return (
    <div className="main-container">
      {/* 상단 네비게이션 */}
      <header className="main-header">
        <h2 className="main-logo">중고마켓</h2>
        <div className="main-header-icons">
          <FontAwesomeIcon icon={faSearch} className="icon" />
          <Link to="/post">
            <FontAwesomeIcon icon={faPlusCircle} className="icon" title="판매 등록" />
          </Link>
          <Link to="/mypage">
            <FontAwesomeIcon icon={faUser} className="icon" title="내 정보" />
          </Link>
        </div>
      </header>

      {/* 카테고리 */}
      <div className="main-categories">
        <button>전자기기</button>
        <button>가구/인테리어</button>
        <button>유아용품</button>
        <button>생활가전</button>
        <button>의류</button>
        <button>기타</button>
      </div>

      {/* 상품 목록 */}
      <div className="main-items">
        {sampleItems.map(item => (
          <div key={item.id} className="item-card">
            <img src={item.image} alt={item.title} />
            <div className="item-info">
              <h3>{item.title}</h3>
              <p>{item.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
