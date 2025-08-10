import React, { useEffect, useState } from 'react';
import LoginForm from '../components/LoginForm';
import '../components/LoginPage.css';

// 쿠키 함수들
const setCookie = (name: string, value: string | number, days: number) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; path=/; expires=${expires}`;
};

const getCookie = (name: string): string | undefined => {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; Max-Age=0; path=/`;
};

const LoginPage = () => {
  const [errorMessage, setErrorMessage] = useState<React.ReactNode>('');
  const [errorCount, setErrorCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const count = parseInt(getCookie('login_fail_count') || '0', 10);
    setErrorCount(count);
    if (count >= 5) setIsLocked(true);
  }, []);

  const handleLogin = async (email: string, password: string) => {
    if (isLocked) return;

    const credentials = `${email}:${password}`;
    const encodedCredentials = btoa(credentials);

    setIsLocked(true);
    setErrorMessage('');

    try {
      const response = await fetch('http://127.0.0.1:3000/api/auth/login', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log('로그인 성공:', data);
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        deleteCookie('login_fail_count');
        window.location.href = '/homepage';
      } else {
        const newCount = errorCount + 1;
        setCookie('login_fail_count', newCount, 1);
        setErrorCount(newCount);

        if (newCount >= 5) {
          setIsLocked(true);
          setErrorMessage('계정이 잠겼습니다. 관리자에게 문의하세요.');
        } else {
          setErrorMessage(`이메일 및 비밀번호를 잘못 입력하셨습니다. 실패 ${newCount}회`);
        }

        setEmail('');
        setPassword('');
      }
    } catch (error) {
      console.error('로그인 요청 중 오류 발생:', error);
      setErrorMessage('서버와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLocked(false);
    }
  };

  // 입력값 유효성 확인 포함 핸들러
  const handleLoginRequest = (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('이메일과 비밀번호를 모두 입력하세요.');
      return;
    }
    handleLogin(email, password);
  };

  return (
    <LoginForm
      onLogin={handleLoginRequest}
      errorMessage={errorMessage}
      isLocked={isLocked}
      email={email}
      password={password}
      setEmail={setEmail}
      setPassword={setPassword}
    />
  );
};

export default LoginPage;
