import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './LoginPage.css';

interface Props {
  onLogin: (email: string, password: string) => void;
  errorMessage: React.ReactNode;
  isLocked: boolean;
}

const LoginForm: React.FC<Props> = ({ onLogin, errorMessage, isLocked }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) return;
    onLogin(email, password);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="login-container">
      <div className="login-box fade-in">
        <h2 className="login-title">로그인</h2>

        {errorMessage && <p className="login-error-message">{errorMessage}</p>}

        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLocked}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLocked}
        />
        <button
          className="login-button"
          onClick={handleSubmit}
          disabled={isLocked}
        >
          로그인
        </button>

        <p className="signup-link">
          아이디가 없으세요? <Link to="/register">회원가입</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
