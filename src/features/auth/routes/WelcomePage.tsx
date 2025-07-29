import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './WelcomePage.css'; // 애니메이션 CSS 추가

const WelcomePage = () => {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 500);

    const navTimer = setTimeout(() => {
      navigate('/login');
    }, 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div className={`welcome-text ${fadeOut ? 'fade-out' : 'fade-in'}`}>
      중고마켓에 오신 걸 환영합니다!
    </div>
  );
};

export default WelcomePage;
