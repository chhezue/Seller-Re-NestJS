import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Footer: React.FC = () => {
    return (
    <footer className="main-footer">
        <div className="footer-content">
        <div className="footer-logo">
            <h3>중고마켓</h3>
            <p>&copy; {new Date().getFullYear()} 중고마켓. All rights reserved.</p>
        </div>
        <nav className="footer-links">
            <Link to="/about">회사 소개</Link>
            <Link to="/terms">이용약관</Link>
            <Link to="/privacy">개인정보처리방침</Link>
        </nav>
        </div>
    </footer>
    );
};

export default Footer;
