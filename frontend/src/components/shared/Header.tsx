import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlusCircle,
    faUser,
    faBell,
    faBars
} from '@fortawesome/free-solid-svg-icons';
import './Header.css';
import useAuth from '../../features/auth/hooks/useAuth';

const Header: React.FC = () => {
    const { username, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate(); // ✅ 리액트 라우터 네비게이터 사용

    const handleLogout = () => {
        logout();
        navigate('/login'); // ✅ 리로드 없이 로그인 페이지로 이동
    };

    return (
        <header className="main-header">
            <div className="header-left">
                <button className="hamburger-menu" aria-label="메뉴 열기">
                    <FontAwesomeIcon icon={faBars} />
                </button>
                <h2 className="main-logo">
                    <Link to="/">중고마켓</Link>
                </h2>
                <nav className="nav-links">
                    <Link to="/">홈</Link>
                    <Link to="/categories">카테고리</Link>
                    <Link to="/notices">공지사항</Link>
                </nav>
            </div>

            <div className="header-right">
                {isAuthenticated ? (
                    <>
                        <Link to="/notifications">
                            <FontAwesomeIcon icon={faBell} className="icon" title="알림" />
                        </Link>

                        <Link to="/NewProductPage">
                            <FontAwesomeIcon icon={faPlusCircle} className="icon" title="판매 등록" />
                        </Link>

                        <Link to="/mypage">
                            <FontAwesomeIcon icon={faUser} className="icon" title="내 정보" />
                        </Link>

                        <div className="user-info">
                            <span className="username">{username}님</span>
                            <button onClick={handleLogout} className="logout-btn">로그아웃</button>
                        </div>
                    </>
                ) : (
                    <Link to="/login" className="login-main-button">로그인</Link>
                )}
            </div>
        </header>
    );
};

export default Header;
