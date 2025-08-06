import React from 'react';
import { Link } from 'react-router-dom';
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

    const handleLogout = () => {
        logout();
        window.location.href = '/Login'; // 새로고침 포함 이동
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
            <Link to="/notifications">
                <FontAwesomeIcon icon={faBell} className="icon" title="알림" />
            </Link>

            {/* ✅ 판매 등록: Link로 이동 */}
            <Link to="/NewProductPage">
                <FontAwesomeIcon icon={faPlusCircle} className="icon" title="판매 등록" />
            </Link>

            <Link to="/mypage">
                <FontAwesomeIcon icon={faUser} className="icon" title="내 정보" />
            </Link>

            {isAuthenticated && (
                <div className="user-info">
                    <span className="username">{username}님</span>
                    <button onClick={handleLogout} className="logout-btn">로그아웃</button>
                </div>
            )}
        </div>
    </header>
    );
};

export default Header;
