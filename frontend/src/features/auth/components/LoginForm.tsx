import React from 'react';
import { Link } from 'react-router-dom';
import './LoginPage.css';

interface Props {
  onLogin: (email: string, password: string) => void;
  errorMessage: React.ReactNode;
  isLocked: boolean;
  email: string;
  password: string;
  setEmail: (val: string) => void;
  setPassword: (val: string) => void;
}

const LoginForm: React.FC<Props> = ({
  onLogin, errorMessage, isLocked,
  email, password, setEmail, setPassword
}) => {
  const handleSubmit = () => {
    onLogin(email, password);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleAutoLogin = () => {
    const randomNumber = Math.floor(Math.random() * 50) + 1;
    const randomEmail = `user${randomNumber}@dummyUser.com`;
    const randomPassword = `user${randomNumber}`;

    setEmail(randomEmail);
    setPassword(randomPassword);

    onLogin(randomEmail, randomPassword);
  };

  return (
    <div className="login-container">
      <div className="login-box fade-in">
        <h2 className="login-title">로그인</h2>

        {errorMessage && <p className="login-error-message">{errorMessage}</p>}

        <div className="input-container">
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLocked}
          />
        </div>

        <div className="input-container">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLocked}
          />
        </div>

        <button
          className="login-button"
          onClick={handleSubmit}
          disabled={isLocked}
        >
          로그인
        </button>

        <p className="signup-link">
          아이디가 없으신가요? <Link to="/register">회원가입</Link>
          <button className="auto-login-button" onClick={handleAutoLogin} disabled={isLocked}>
            자동 로그인
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
