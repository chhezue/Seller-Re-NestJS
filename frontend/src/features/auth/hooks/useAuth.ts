// auth/hooks/useAuth.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const REFRESH_ENDPOINT = 'http://127.0.0.1:3000/api/auth/refresh';
const REFRESH_SKEW_SEC = 60; // 만료 60초 전 미리 갱신
const API_BASE = 'http://127.0.0.1:3000';

interface DecodedToken {
    sub?: string;       // 사용자 ID
    username?: string;  // 닉네임
    exp?: number;
    iat?: number;
    [key: string]: unknown;
}

export type RegionItem = {
    id: string;
    name: string;
    parentId: string | null;
    children?: RegionItem[];
    /** 계산 필드 */
    cityName?: string;   // 부모가 null이면 자기 자신(시/도), 아니면 부모 이름
    fullName?: string;   // "시/도 구/군" 형식 (루트면 시/도 단독)
};

export type RegisterPayload = {
    username: string;
    email: string;
    password: string;
    phoneNumber: string;
    region_id: string;       // 구의 id
    profileImage?: string;
};

export interface Region {
    id: string;
    name: string;
    parentId?: string | null;
}

export interface Profile {
    id: string;
    username: string;
    email: string;
    profileImage?: string;
    phoneNumber?: string;
    region?: Region | null;
    region_id?: string;
    favoritesCount?: number;
    listingsCount?: number;
    createdAt?: string;
    updatedAt?: string;
    role?: 'USER' | 'ADMIN' | string;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | string;
    passwordFailedCount?: number;
}

const useAuth = () => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    // 다음 자동 갱신 타이머
    const refreshTimerRef = useRef<number | null>(null);
    // 동시 재발급 병합
    const refreshInFlightRef = useRef<Promise<string | null> | null>(null);
    // 토스트 스팸 방지
    const lastToastAtRef = useRef<number>(0);

    const safeToast = (fn: (msg: string) => void, msg: string, gapMs = 1500) => {
        const now = Date.now();
        if (now - lastToastAtRef.current > gapMs) {
            lastToastAtRef.current = now;
            fn(msg);
        }
    };

    const clearRefreshTimer = () => {
        if (refreshTimerRef.current !== null) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    };

    const decodeToken = (token: string): void => {
        try {
            const decoded = jwtDecode<DecodedToken>(token);
            setUsername(typeof decoded.username === 'string' ? decoded.username : null);
            setUserId(typeof decoded.sub === 'string' ? decoded.sub : null);
        } catch (err) {
            console.error('토큰 디코딩 실패:', err);
            setUsername(null);
            setUserId(null);
        }
    };

    const isExpiredOrNear = (token: string, skewSec = REFRESH_SKEW_SEC) => {
        try {
            const { exp } = jwtDecode<DecodedToken>(token);
            if (!exp) return true;
            const nowSec = Math.floor(Date.now() / 1000);
            return exp - nowSec <= skewSec;
        } catch {
            return true;
        }
    };

    const scheduleRefresh = (token: string) => {
        clearRefreshTimer();
        try {
            const { exp } = jwtDecode<DecodedToken>(token);
            if (!exp) return;
            const nowMs = Date.now();
            const targetMs = exp * 1000 - REFRESH_SKEW_SEC * 1000;
            const delay = Math.max(targetMs - nowMs, 0);
            refreshTimerRef.current = window.setTimeout(() => {
                void refreshAccessToken();
            }, delay);
        } catch {
            // 디코드 실패 시 스케줄 생략
        }
    };

    const coreRefresh = async (): Promise<string | null> => {
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (!refreshToken) {
            safeToast(toast.error, '세션이 만료되었습니다. 다시 로그인해주세요.');
            logout();
            return null;
        }
        try {
            const res = await fetch(REFRESH_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (!res.ok) {
                safeToast(toast.error, '세션이 만료되었습니다. 다시 로그인해주세요.');
                logout();
                return null;
            }

            const data = await res.json();
            const newAccess = data.accessToken as string | undefined;
            const newRefresh = data.refreshToken as string | undefined;

            if (!newAccess) {
                safeToast(toast.error, '세션 재발급에 실패했습니다. 다시 로그인해주세요.');
                logout();
                return null;
            }

            localStorage.setItem(TOKEN_KEY, newAccess);
            if (newRefresh) localStorage.setItem(REFRESH_KEY, newRefresh);

            setAccessToken(newAccess);
            decodeToken(newAccess);
            scheduleRefresh(newAccess);

            safeToast(toast.success, '세션이 연장되었습니다.');
            return newAccess;
        } catch (e) {
            console.error('토큰 재발급 실패:', e);
            safeToast(toast.error, '네트워크 오류로 세션 연장에 실패했습니다.');
            logout();
            return null;
        }
    };

    // 동시 재발급 방지 래퍼
    const refreshAccessToken = async (): Promise<string | null> => {
        if (refreshInFlightRef.current) {
            return await refreshInFlightRef.current;
        }
        const p = coreRefresh().finally(() => {
            refreshInFlightRef.current = null;
        });
        refreshInFlightRef.current = p;
        return await p;
    };

    // 외부에서 사용 직전에 유효 토큰이 필요할 때 호출
    const getValidAccessToken = async (): Promise<string | null> => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;
        if (isExpiredOrNear(token)) {
            return await refreshAccessToken();
        }
        return token;
    };

    // ✅ 토큰 자동 첨부 fetch + 401 자동 재시도
    const authFetch = async (
        input: RequestInfo | URL,
        init?: RequestInit,
        opts?: { requireAuth?: boolean }
    ): Promise<Response> => {
        let token = await getValidAccessToken();

        if (opts?.requireAuth && !token) {
            throw new Error('로그인이 필요합니다.');
        }

        const doFetch = (tk: string | null) => {
            const mergedHeaders: HeadersInit = {
                'Content-Type': 'application/json',
                ...(init?.headers as HeadersInit),
                ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
            };
            return fetch(input, { ...init, headers: mergedHeaders });
        };

        // 1차 요청
        let res = await doFetch(token);

        // 401이면 1회 재발급 후 재시도
        if (res.status === 401) {
            token = await refreshAccessToken();
            if (!token) {
                // refresh 실패
                return res;
            }
            res = await doFetch(token);
        }

        return res;
    };

    // ✅ 지역 목록 가져오기 (/api/common/region)
    const getRegions = async (): Promise<RegionItem[]> => {
        const res = await authFetch(`${API_BASE}/api/common/region`, {
            method: 'GET',
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || `지역 목록 조회 실패 (${res.status})`);
        }
        const data = (await res.json()) as RegionItem[];
        return Array.isArray(data) ? data : [];
    };

    // id → "시/도 구/군" 형태의 풀 네임을 반환
    const getRegionFullNameById = async (id: string): Promise<string> => {
        if (!id) return '';
        const list = await getRegions();
        const node = list.find(r => r.id === id);
        if (!node) return '';
        // 루트(시/도)면 이름만
        if (!node.parentId) return node.name;
        // 부모(시/도) 찾아 합치기
        const city = list.find(r => r.id === node.parentId)?.name ?? '';
        return city ? `${city} ${node.name}` : node.name;
    };

    // ✅ 회원가입
    const registerUser = async (payload: RegisterPayload) => {
        const res = await fetch(`${API_BASE}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            let message = '';
            try {
                const data = await res.json();
                message = data?.message || '';
            } catch {
                message = await res.text().catch(() => '');
            }
            throw new Error(message || `회원가입 실패 (${res.status})`);
        }
        return await res.json();
    };

    const login = (token: string, refreshToken?: string): void => {
        localStorage.setItem(TOKEN_KEY, token);
        if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
        setAccessToken(token);
        decodeToken(token);
        scheduleRefresh(token);
    };

    const logout = (): void => {
        clearRefreshTimer();
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setAccessToken(null);
        setUsername(null);
        setUserId(null);
    };

    // 초기화 + 멀티탭 동기화
    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            setAccessToken(token);
            decodeToken(token);
            if (isExpiredOrNear(token)) {
                refreshAccessToken().finally(() => setInitialized(true));
                return;
            } else {
                scheduleRefresh(token);
            }
        }
        setInitialized(true);

        const onStorage = (e: StorageEvent) => {
            if (e.key === TOKEN_KEY) {
                const newToken = e.newValue;
                setAccessToken(newToken);
                if (newToken) {
                    decodeToken(newToken);
                    scheduleRefresh(newToken);
                } else {
                    clearRefreshTimer();
                    setUsername(null);
                    setUserId(null);
                }
            }
            if (e.key === REFRESH_KEY && !e.newValue) {
                // 다른 탭에서 로그아웃한 경우
                logout();
            }
        };
        window.addEventListener('storage', onStorage);

        return () => {
            window.removeEventListener('storage', onStorage);
            clearRefreshTimer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isAuthenticated = Boolean(accessToken);

    return {
        accessToken,
        username,
        userId,
        isAuthenticated,
        login,
        logout,
        initialized,
        refreshAccessToken,    // 수동 재발급
        getValidAccessToken,   // 사용 직전에 유효 토큰 보장

        // 유틸
        authFetch,
        getRegions,

        // 신규
        registerUser,
        getRegionFullNameById,
    };
};

export default useAuth;
