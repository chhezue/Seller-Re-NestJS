import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../components/HomePage.css'; // 이 경로도 필요에 따라 수정

const HomePage: React.FC = () => {
  const [animate, setAnimate] = useState(false);

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

  const categories = ['전자기기', '가구/인테리어', '유아용품', '생활가전', '의류', '기타'];

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <div className={`main-container ${animate ? 'fade-in' : ''}`}>
      <div className='main-homepage'>
        <div className="main-categories">
          {categories.map((category, index) => (
            <button key={index} className="category-btn">{category}</button>
          ))}
        </div>

        <div className="main-items">
          {sampleItems.map(item => (
            <Link to={`/item/${item.id}`} key={item.id} className="item-card">
              <img src={item.image} alt={item.title} />
              <div className="item-info">
                <h3>{item.title}</h3>
                <p>{item.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
