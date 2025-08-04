import { useState, useEffect } from 'react';

// 로컬스토리지 키 상수화
const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken'; // 선택적 확장용

const useAuth = () => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false); // 로딩 완료 상태

    // 앱 최초 실행 시 토큰 읽기
    useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        setAccessToken(token);
    }
    setInitialized(true); // 토큰 읽기 완료
    }, []);

    // 로그인 시 토큰 저장 및 상태 업데이트
    const login = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    setAccessToken(token);
    };

    // 로그아웃 시 토큰 제거 및 상태 초기화
    const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY); // 선택: refreshToken도 삭제
    setAccessToken(null);
    };

    // 인증 상태 확인
    const isAuthenticated = !!accessToken;

    return {
    accessToken,
    isAuthenticated,
    login,
    logout,
    initialized, // App에서 로딩 완료 체크용
    };
    };

export default useAuth;
