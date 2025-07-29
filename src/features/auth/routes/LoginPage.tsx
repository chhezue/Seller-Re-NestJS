import React, { useEffect, useState } from 'react';
import LoginForm from '../components/LoginForm';
import { useNavigate } from 'react-router-dom';
import '../components/LoginPage.css';
// ✅ 쿠키 설정 함수
const setCookie = (name: string, value: string | number, days: number) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; path=/; expires=${expires}`;
};

// ✅ 쿠키 가져오기 함수
const getCookie = (name: string): string | undefined => {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
};

// ✅ 쿠키 삭제 함수
const deleteCookie = (name: string) => {
  document.cookie = `${name}=; Max-Age=0; path=/`;
};

const LoginPage = () => {
  const [errorMessage, setErrorMessage] = useState<React.ReactNode>('');
  const [errorCount, setErrorCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const count = parseInt(getCookie('login_fail_count') || '0', 10);
    setErrorCount(count);
    if (count >= 5) setIsLocked(true);
  }, []);

  const handleLogin = (email: string, password: string) => {
    if (isLocked) return;

    const validEmail = 'test@example.com';
    const validPassword = '1234';

    if (email === validEmail && password === validPassword) {
      deleteCookie('login_fail_count');
      setErrorMessage('');
      setErrorCount(0);
      navigate('/homepage');
    } else {
      const newCount = errorCount + 1;
      setCookie('login_fail_count', newCount, 1);
      setErrorCount(newCount);

      if (newCount >= 5) {
        setIsLocked(true);
        setErrorMessage(
          <>
            계정이 잠겼습니다. <br /> 관리자에게 문의하세요.
          </>
        );
      } else {
        setErrorMessage(
          <>
            이메일 및 비밀번호를 잘못 입력하셨습니다. <br />
            5회 이상 틀릴 시 계정이 잠깁니다. (실패 {newCount}회)
          </>
        );
      }
    }
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      errorMessage={errorMessage}
      isLocked={isLocked}
    />
  );
};

export default LoginPage;
