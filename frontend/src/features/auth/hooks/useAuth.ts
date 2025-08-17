import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

interface DecodedToken {
    sub?: string;         // ✅ 사용자 ID
    username?: string;    // ✅ 닉네임
    exp?: number;
    iat?: number;
    [key: string]: unknown;
}

const useAuth = () => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);  // ✅ 추가
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            setAccessToken(token);
            decodeToken(token);
        }
        setInitialized(true);
    }, []);

    const decodeToken = (token: string): void => {
        try {
            const decoded = jwtDecode<DecodedToken>(token);
            console.log('디코딩된 토큰:', decoded.sub);

            if (decoded.username && typeof decoded.username === 'string') {
                setUsername(decoded.username);
            } else {
                setUsername(null);
            }

            if (decoded.sub && typeof decoded.sub === 'string') {
                setUserId(decoded.sub);
            } else {
                setUserId(null);
            }
        } catch (err) {
            console.error('토큰 디코딩 실패:', err);
            setUsername(null);
            setUserId(null);
        }
    };

    const login = (token: string): void => {
        localStorage.setItem(TOKEN_KEY, token);
        setAccessToken(token);
        decodeToken(token);
    };

    const logout = (): void => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setAccessToken(null);
        setUsername(null);
        setUserId(null);
    };

    const isAuthenticated = Boolean(accessToken);

    return {
        accessToken,
        username,
        userId,            // ✅ 반환 추가
        isAuthenticated,
        login,
        logout,
        initialized,
    };
};

export default useAuth;
