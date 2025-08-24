import { useCallback, useEffect, useRef, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

const API_BASE = 'http://127.0.0.1:3000';
const REFRESH_ENDPOINT = `${API_BASE}/api/auth/refresh`;
const LOGIN_ENDPOINT = `${API_BASE}/api/auth/login`;
const UNLOCK_REQUEST_ENDPOINT = `${API_BASE}/api/auth/unlock/request`;
const UNLOCK_VERIFY_ENDPOINT = `${API_BASE}/api/auth/unlock/verify`;

const REFRESH_SKEW_SEC = 60; // 만료 60초 전 미리 갱신

/** 같은 탭 동기화를 위한 커스텀 이벤트 */
const AUTH_EVENT = 'auth:changed';
const emitAuthChanged = () => {
    try { window.dispatchEvent(new Event(AUTH_EVENT)); } catch { /* noop */ }
};

interface DecodedToken {
    sub?: string;
    username?: string;
    exp?: number;
    iat?: number;
    [key: string]: unknown;
}

export type RegionItem = {
    id: string;
    name: string;
    parentId: string | null;
    children?: RegionItem[];
};

export type RegisterPayload = {
    username: string;
    email: string;
    password: string;
    phoneNumber: string;
    region_id: string;
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

    const refreshTimerRef = useRef<number | null>(null);
    const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

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
                logout();
                return null;
            }

            const data = await res.json();
            const newAccess = data?.accessToken as string | undefined;
            const newRefresh = data?.refreshToken as string | undefined;

            if (!newAccess) {
                logout();
                return null;
            }

            localStorage.setItem(TOKEN_KEY, newAccess);
            if (newRefresh) localStorage.setItem(REFRESH_KEY, newRefresh);

            setAccessToken(newAccess);
            decodeToken(newAccess);
            scheduleRefresh(newAccess);

            emitAuthChanged(); // 같은 탭 동기화
            return newAccess;
        } catch (e) {
            console.error('토큰 재발급 실패:', e);
            logout();
            return null;
        }
    };

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

    const getValidAccessToken = async (): Promise<string | null> => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;
        if (isExpiredOrNear(token)) {
            return await refreshAccessToken();
        }
        return token;
    };

    /** 토큰 자동 첨부 fetch + 401 1회 재시도 */
    const authFetch = async (
        input: RequestInfo | URL,
        init?: RequestInit,
        opts?: { requireAuth?: boolean }
    ): Promise<Response> => {
        let token = await getValidAccessToken();

        if (opts?.requireAuth && !token) {
            const err = new Error('로그인이 필요합니다.');
            (err as any).status = 401;
            throw err;
        }

        const doFetch = (tk: string | null) => {
            const mergedHeaders: HeadersInit = {
                'Content-Type': 'application/json',
                ...(init?.headers as HeadersInit),
                ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
            };
            return fetch(input, { ...init, headers: mergedHeaders });
        };

        // 1차
        let res = await doFetch(token);

        // 401 → 1회 재발급 후 재시도
        if (res.status === 401) {
            token = await refreshAccessToken();
            if (!token) return res;
            res = await doFetch(token);
        }

        return res;
    };

    /** 로그인(이메일/비번) */
    const loginWithPassword = async (email: string, password: string) => {
        const credentials = `${email}:${password}`;
        const encoded = btoa(credentials);

        const res = await fetch(LOGIN_ENDPOINT, {
            method: 'POST',
            headers: { Authorization: `Basic ${encoded}` },
        });

        if (!res.ok) {
            let body: any = null;
            try {
                body = await res.json();
            } catch {
                // json이 아니면 무시
            }

            // 헤더에서도 시도 (서버가 넣어줄 때)
            const headerCount = res.headers.get('X-Fail-Count');
            const parsedHeaderCount = headerCount ? Number(headerCount) : NaN;

            const err = new Error(body?.message || `로그인 실패 (${res.status})`);
            (err as any).status = res.status;
            (err as any).code = res.status === 403 ? 'ACCOUNT_LOCKED'
                                : res.status === 401 ? 'INVALID_CREDENTIALS'
                                : 'LOGIN_FAILED';

            // 다양한 필드명 대비
            const bodyCount =
                body?.password_failed_count ??
                body?.passwordFailedCount ??
                body?.failCount ??
                body?.count ??
                null;

            (err as any).passwordFailedCount =
                typeof bodyCount === 'number'
                    ? bodyCount
                    : Number.isFinite(parsedHeaderCount)
                    ? parsedHeaderCount
                    : undefined;

            throw err;
}

        const data = await res.json();
        const at = data?.accessToken as string | undefined;
        const rt = data?.refreshToken as string | undefined;

        if (!at) {
            throw new Error('토큰이 비어 있습니다.');
        }

        login(at, rt);
        return data;
    };

    const login = (token: string, refreshToken?: string): void => {
        localStorage.setItem(TOKEN_KEY, token);
        if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
        setAccessToken(token);
        decodeToken(token);
        scheduleRefresh(token);
        emitAuthChanged(); // 같은 탭 동기화
    };

    const logout = (): void => {
        clearRefreshTimer();
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem('filters:selectedRegion')
        setAccessToken(null);
        setUsername(null);
        setUserId(null);
        emitAuthChanged(); // 같은 탭 동기화
    };

    /** 지역 트리 */
    const getRegions = async (): Promise<RegionItem[]> => {
        const res = await authFetch(`${API_BASE}/api/common/region/tree`, {
            method: 'GET',
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || `지역 목록 조회 실패 (${res.status})`);
        }
        const data = (await res.json()) as RegionItem[];
        return Array.isArray(data) ? data : [];
    };

    /** id → "시/도 구/군" */
    const getRegionFullNameById = async (id: string): Promise<string> => {
        if (!id) return '';
        const list = await getRegions();

        // 트리 플래튼 + 맵
        const map = new Map<string, RegionItem>();
        const stack: RegionItem[] = [...list];
        while (stack.length) {
            const n = stack.pop()!;
            map.set(n.id, n);
            if (n.children?.length) stack.push(...n.children);
        }

        const node = map.get(id);
        if (!node) return '';
        if (!node.parentId) return node.name;
        const city = node.parentId ? map.get(node.parentId)?.name ?? '' : '';
        return city ? `${city} ${node.name}` : node.name;
    };

    /** 잠금 해제 코드 요청 */
    const requestUnlock = async (email: string): Promise<void> => {
        const res = await fetch(UNLOCK_REQUEST_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        if (!res.ok) {
            let msg = '';
            try {
                const data = await res.json();
                msg = data?.message || '';
            } catch {
                msg = await res.text().catch(() => '');
            }
            const err = new Error(msg || `잠금 해제 요청 실패 (${res.status})`);
            (err as any).status = res.status;
            throw err;
        }
    };

    /** 잠금 해제 코드 검증 */
    const verifyUnlock = async (email: string, code: string): Promise<void> => {
        const res = await fetch(UNLOCK_VERIFY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                verificationCode: String(code).trim(), // 서버는 verificationCode(string) 최소 6자 요구
            }),
        });
        if (!res.ok) {
            let body: any = null;
            try {
                body = await res.json();
            } catch {
                // ignore
            }
            const msg =
                body?.message ||
                (await res.text().catch(() => '')) ||
                `잠금 해제 검증 실패 (${res.status})`;
            const err = new Error(msg);
            (err as any).status = res.status;
            (err as any).errorCode = body?.errorCode;
            throw err;
        }
    };

    /** 초기화 + 이벤트 구독 */
    useEffect(() => {
        const bootstrap = () => {
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
            } else {
                setAccessToken(null);
                setUsername(null);
                setUserId(null);
            }
            setInitialized(true);
        };

        bootstrap();

        const onStorage = (e: StorageEvent) => {
            if (e.key === TOKEN_KEY) {
                bootstrap(); // 토큰 변경 즉시 재부트
            }
            if (e.key === REFRESH_KEY && !e.newValue) {
                logout();
            }
        };

        const onAuthChanged = () => {
            bootstrap(); // 같은 탭에서 login/logout/refresh 반영
        };

        window.addEventListener('storage', onStorage);
        window.addEventListener(AUTH_EVENT, onAuthChanged);

        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(AUTH_EVENT, onAuthChanged);
            clearRefreshTimer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isAuthenticated = Boolean(accessToken);

    return {
        // 상태
        accessToken,
        username,
        userId,
        isAuthenticated,
        initialized,

        // 인증 액션
        login,
        logout,
        loginWithPassword,
        refreshAccessToken,
        getValidAccessToken,

        // 유틸 fetch
        authFetch,

        // 지역
        getRegions,
        getRegionFullNameById,

        // 계정 잠금 해제
        requestUnlock,
        verifyUnlock,
    };
};

export default useAuth;
