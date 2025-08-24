import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faUser, faBell, faBars } from '@fortawesome/free-solid-svg-icons';
import './Header.css';
import useAuth from '../../features/auth/hooks/useAuth';

const Header: React.FC = () => {
    const { username, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    // ✅ 헤더 높이만큼 placeholder 자동 보정
    const headerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const updateHeaderHeight = () => {
            const h = headerRef.current?.offsetHeight ?? 64;
            document.documentElement.style.setProperty('--header-h', `${h}px`);
        };
        updateHeaderHeight();
        window.addEventListener('resize', updateHeaderHeight);
        return () => window.removeEventListener('resize', updateHeaderHeight);
    }, [isAuthenticated, username]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* ✅ 고정 래퍼 */}
            <div className="header-fixed">
                <header ref={headerRef} className="main-header">
                    <div className="header-left">
                        <h2 className="main-logo">
                            <Link
                                to="/"
                                className="logo-link"
                                onClick={() => {
                                    try {
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    } catch {
                                        window.scrollTo(0, 0);
                                    }
                                }}
                            >
                                Seller-<span className="accent-re">Re</span>
                            </Link>
                        </h2>
                    </div>

                    <div className="header-right">
                        {isAuthenticated ? (
                            <>
                                <Link to="/notifications">
                                    <FontAwesomeIcon icon={faBell} className="icon" title="알림" />
                                </Link>

                                <Link to="/NewProductPage">
                                    <FontAwesomeIcon icon={faPlusCircle} className="icon" title="상품 등록하기" />
                                </Link>

                                <Link to="/profile" className="profile-link" title="내 정보">
                                    <FontAwesomeIcon icon={faUser} className="icon" />
                                    <span className="sr-only"></span>
                                </Link>

                                <div className="user-info">
                                    <span className="username">{username}님</span>
                                    <button onClick={handleLogout} className="logout-btn">로그아웃</button>
                                </div>
                            </>
                        ) : (
                            <Link to="/login" className="login-main-button">로그인 / 회원가입</Link>
                        )}
                    </div>
                </header>
            </div>

            {/* ✅ 고정 헤더 높이만큼 공간 확보 */}
            <div className="header-offset" aria-hidden="true" />
        </>
    );
};

export default Header;
