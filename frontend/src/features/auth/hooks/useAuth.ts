// auth/hooks/useAuth.ts
import { useEffect, useRef, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

const API_BASE = 'http://127.0.0.1:3000';
const REFRESH_ENDPOINT = `${API_BASE}/api/auth/refresh`;
const LOGIN_ENDPOINT = `${API_BASE}/api/auth/login`;
const REGISTER_ENDPOINT = `${API_BASE}/api/users`;
const UNLOCK_REQUEST_ENDPOINT = `${API_BASE}/api/auth/unlock/request`;
const UNLOCK_VERIFY_ENDPOINT = `${API_BASE}/api/auth/unlock/verify`;
const LOGOUT_ENDPOINT = `${API_BASE}/api/auth/logout`;
export const TEMP_USER_IMAGE_ENDPOINT = `${API_BASE}/api/uploads/tempUserImage`;

const REFRESH_SKEW_SEC = 60;
const AUTH_EVENT = 'auth:changed';
const emitAuthChanged = () => {
    try { window.dispatchEvent(new Event(AUTH_EVENT)); } catch {}
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
    region_id?: string;
    /** ✅ 서버가 요구: 임시 업로드로 받은 파일의 id */
    profileImageId?: string;
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
    profileImage?: string | null;
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
        } catch {
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
            refreshTimerRef.current = window.setTimeout(() => { void refreshAccessToken(); }, delay);
        } catch {}
    };

    const clearLocalAuth = () => {
        clearRefreshTimer();
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem('filters:selectedRegion');
        setAccessToken(null);
        setUsername(null);
        setUserId(null);
        emitAuthChanged();
    };

    const coreRefresh = async (): Promise<string | null> => {
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (!refreshToken) { clearLocalAuth(); return null; }
        try {
            const res = await fetch(REFRESH_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });
            if (!res.ok) { clearLocalAuth(); return null; }
            const data = await res.json();
            const newAccess = data?.accessToken as string | undefined;
            const newRefresh = data?.refreshToken as string | undefined;
            if (!newAccess) { clearLocalAuth(); return null; }
            localStorage.setItem(TOKEN_KEY, newAccess);
            if (newRefresh) localStorage.setItem(REFRESH_KEY, newRefresh);
            setAccessToken(newAccess);
            decodeToken(newAccess);
            scheduleRefresh(newAccess);
            emitAuthChanged();
            return newAccess;
        } catch {
            clearLocalAuth();
            return null;
        }
    };

    const refreshAccessToken = async (): Promise<string | null> => {
        if (refreshInFlightRef.current) return await refreshInFlightRef.current;
        const p = coreRefresh().finally(() => { refreshInFlightRef.current = null; });
        refreshInFlightRef.current = p;
        return await p;
    };

    const getValidAccessToken = async (): Promise<string | null> => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;
        if (isExpiredOrNear(token)) return await refreshAccessToken();
        return token;
    };

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

        let res = await doFetch(token);
        if (res.status === 401) {
            token = await refreshAccessToken();
            if (!token) return res;
            res = await doFetch(token);
        }
        return res;
    };

    const loginWithPassword = async (email: string, password: string) => {
        const encoded = btoa(`${email}:${password}`);
        const res = await fetch(LOGIN_ENDPOINT, {
            method: 'POST',
            headers: { Authorization: `Basic ${encoded}` },
        });
        if (!res.ok) {
            let body: any = null;
            try { body = await res.json(); } catch {}
            const err = new Error(body?.message || `로그인 실패 (${res.status})`);
            (err as any).status = res.status;
            throw err;
        }
        const data = await res.json();
        const at = data?.accessToken as string | undefined;
        const rt = data?.refreshToken as string | undefined;
        if (!at) throw new Error('토큰이 비어 있습니다.');
        login(at, rt);
        return data;
    };

    const login = (token: string, refreshToken?: string): void => {
        localStorage.setItem(TOKEN_KEY, token);
        if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
        setAccessToken(token);
        decodeToken(token);
        scheduleRefresh(token);
        emitAuthChanged();
    };

    const registerUser = async (payload: RegisterPayload, opts?: { autoLogin?: boolean }) => {
        const body: Record<string, unknown> = {
            username: payload.username,
            email: payload.email,
            password: payload.password,
            phoneNumber: payload.phoneNumber,
        };
        if (payload.region_id) body.region_id = payload.region_id;
        if (payload.profileImageId) body.profileImageId = payload.profileImageId; // ✅ 이거만!

        const res = await fetch(REGISTER_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            let message = `회원가입 실패 (${res.status})`;
            let errorCode: string | undefined;
            try {
                const data = await res.json();
                if (data?.message) message = data.message;
                errorCode = (data?.errorCode || data?.code) as string | undefined; // ✅ 에러코드 추출
            } catch {
                const txt = await res.text().catch(() => '');
                if (txt) message = txt;
            }
            const err = new Error(message);
            (err as any).status = res.status;
            if (errorCode) (err as any).errorCode = errorCode; // ✅ 에러코드 첨부
            throw err;
        }

        const data = await res.json().catch(() => ({} as any));
        if (opts?.autoLogin) {
            const at = (data as any)?.accessToken as string | undefined;
            const rt = (data as any)?.refreshToken as string | undefined;
            if (at) login(at, rt);
        }
        return data;
    };

    const logout = async (): Promise<void> => {
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        try {
            if (refreshToken) {
                await fetch(LOGOUT_ENDPOINT, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${refreshToken}` },
                });
            }
        } catch {} finally {
            clearLocalAuth();
        }
    };

    const getRegions = async (): Promise<RegionItem[]> => {
        const res = await authFetch(`${API_BASE}/api/common/region/tree`, { method: 'GET' });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || `지역 목록 조회 실패 (${res.status})`);
        }
        const data = (await res.json()) as RegionItem[];
        return Array.isArray(data) ? data : [];
    };

    const getRegionFullNameById = async (id: string): Promise<string> => {
        if (!id) return '';
        const list = await getRegions();
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

    const requestUnlock = async (email: string): Promise<void> => {
        const res = await fetch(UNLOCK_REQUEST_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        if (!res.ok) {
            let msg = '';
            try { const data = await res.json(); msg = data?.message || ''; }
            catch { msg = await res.text().catch(() => ''); }
            const err = new Error(msg || `잠금 해제 요청 실패 (${res.status})`);
            (err as any).status = res.status;
            throw err;
        }
    };

    const verifyUnlock = async (email: string, code: string): Promise<void> => {
        const res = await fetch(UNLOCK_VERIFY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, verificationCode: String(code).trim() }),
        });
        if (!res.ok) {
            let body: any = null;
            try { body = await res.json(); } catch {}
            const msg = body?.message || (await res.text().catch(() => '')) || `잠금 해제 검증 실패 (${res.status})`;
            const err = new Error(msg);
            (err as any).status = res.status;
            (err as any).errorCode = body?.errorCode;
            throw err;
        }
    };

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
            if (e.key === TOKEN_KEY) bootstrap();
            if (e.key === REFRESH_KEY && !e.newValue) clearLocalAuth();
        };

        const onAuthChanged = () => { bootstrap(); };

        window.addEventListener('storage', onStorage);
        window.addEventListener(AUTH_EVENT, onAuthChanged);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(AUTH_EVENT, onAuthChanged);
            clearRefreshTimer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** ✅ 임시 업로드: id + url 반환 */
    const uploadTempUserImage = async (file: File): Promise<{ id: string; url: string }> => {
        const tryUpload = async (field: 'files' | 'file') => {
            const form = new FormData();
            form.append(field, file, file.name);
            const res = await fetch(TEMP_USER_IMAGE_ENDPOINT, { method: 'POST', body: form });
            const bodyText = await res.text().catch(() => '');
            if (!res.ok) {
                if (res.status === 400 && /Unexpected field/i.test(bodyText)) {
                    const err = new Error('UNEXPECTED_FIELD');
                    (err as any).raw = bodyText;
                    throw err;
                }
                throw new Error(bodyText || `임시 업로드 실패 (${res.status})`);
            }
            const data = bodyText ? JSON.parse(bodyText) : {};
            const item = Array.isArray(data) ? data[0] : data;
            const id = item?.id;
            const url = item?.url || item?.tempUrl;
            if (!id || !url) throw new Error('임시 업로드 응답에 id/url 없음');
            console.log('[useAuth] temp uploaded:', { id, url });
            return { id, url };
        };

        try {
            return await tryUpload('files');
        } catch (e: any) {
            if (e?.message !== 'UNEXPECTED_FIELD') throw e;
            return await tryUpload('file');
        }
    };

    const isAuthenticated = Boolean(accessToken);

    return {
        accessToken,
        username,
        userId,
        isAuthenticated,
        initialized,

        login,
        logout,
        loginWithPassword,
        refreshAccessToken,
        getValidAccessToken,
        registerUser,

        authFetch,
        getRegions,
        getRegionFullNameById,
        requestUnlock,
        verifyUnlock,

        uploadTempUserImage,
    };
};

export default useAuth;
