import React, { useEffect, useState } from 'react';
import LoginForm from '../components/LoginForm';
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

  useEffect(() => {
    const count = parseInt(getCookie('login_fail_count') || '0', 10);
    setErrorCount(count);
    if (count >= 5) setIsLocked(true);
  }, []);

  const handleLogin = async (email: string, password: string) => {
    if (isLocked) return;

    // 1. Basic Authentication을 위한 문자열 생성 (email:password)
    const credentials = `${email}:${password}`;
    const encodedCredentials = btoa(credentials);

    setIsLocked(true); // 요청 시작 시 UI 잠금
    setErrorMessage(''); // 이전 에러 메시지 초기화

    try {
      const response = await fetch('http://127.0.0.1:3000/api/auth/login', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        // 2. 로그인 성공 시
        console.log('로그인 성공:', data);
        // 받아온 토큰을 localStorage나 쿠키에 저장
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        deleteCookie('login_fail_count'); // 이 부분 추가
        // 메인 페이지로 이동
        window.location.href = '/homepage';
      } else {
        // 3. 로그인 실패 시
        const newCount = errorCount + 1;
        setCookie('login_fail_count', newCount, 1);
        setErrorCount(newCount);

        if (newCount >= 5) {
          setIsLocked(true);
          setErrorMessage('계정이 잠겼습니다. 관리자에게 문의하세요.');
        } else {
          setErrorMessage(`이메일 및 비밀번호를 잘못 입력하셨습니다. 실패 ${newCount}회`);
        }
      }
    } catch (error) {
      console.error('로그인 요청 중 오류 발생:', error);
      setErrorMessage('서버와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLocked(false); // 요청 완료 시 UI 잠금 해제
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
