import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // ✅ named import 사용

// 로컬스토리지 키 상수화
const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

// JWT 디코딩 타입
interface DecodedToken {
    username?: string;
    exp?: number;
    iat?: number;
    [key: string]: unknown; // ✅ any 대신 unknown 사용
}

const useAuth = () => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    // 초기 토큰 로드
    useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        setAccessToken(token);
        decodeToken(token);
    }
    setInitialized(true);
    }, []);

    // 토큰 디코드 함수
    const decodeToken = (token: string): void => {
    try {
        const decoded = jwtDecode<DecodedToken>(token); // ✅ 타입 지정
        console.log('디코딩된 토큰:', decoded);  // ✅ 디코딩 값 로그 출력

        if (decoded.username && typeof decoded.username === 'string') {
        setUsername(decoded.username);
        } else {
        setUsername(null);
        }
    } catch (err) {
        console.error('토큰 디코딩 실패:', err);
        setUsername(null);
    }
    };

    // 로그인 함수
    const login = (token: string): void => {
        localStorage.setItem(TOKEN_KEY, token);
        setAccessToken(token);
        decodeToken(token);
    };

    // 로그아웃 함수
    const logout = (): void => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setAccessToken(null);
        setUsername(null);
    };

    const isAuthenticated = Boolean(accessToken);

    return {
        accessToken,
        username,         // ✅ 컴포넌트에서 닉네임으로 활용 가능
        isAuthenticated,  // ✅ 로그인 여부
        login,
        logout,
        initialized,      // ✅ 로딩 완료 여부
    };
};

export default useAuth;
