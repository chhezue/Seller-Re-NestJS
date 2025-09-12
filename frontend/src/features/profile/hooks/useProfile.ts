// profile/hooks/useProfile.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from '../../auth/hooks/useAuth';

const API_BASE = 'http://127.0.0.1:3000';

export interface Region {
    id: string;
    name: string;
    parentId?: string | null;
}

type RegionItem = {
    id: string;
    name: string;
    parentId?: string | null;
    children?: RegionItem[];
};

export interface Profile {
    id: string;
    username: string;
    email: string;
    /** 서버 응답이 문자열/객체/null 등 다양해도, 훅에서는 항상 최종 URL 문자열만 노출 */
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

    // 파생필드(프론트에서 계산)
    regionCityName?: string;       // 시/도
    regionDistrictName?: string;   // 구/군/시
    regionFullName?: string;       // "시/도 구/군/시"
}

/** 이메일(옵션, 보낼 때만) + 비밀번호(선택) 포함 */
export type UpdateProfilePayload = {
    username?: string;
    email?: string;
    password?: string;             // 새 비밀번호 (선택)
    phoneNumber?: string;
    region_id?: string;            // 서버에서 region_id 받도록 유지
    /** PATCH 시 보낼 이미지 임시파일 ID (삭제는 null, 변경 없음은 undefined) */
    profileImageId?: string | null;
};

/** 서버 응답의 profileImage를 URL 문자열로 정규화 */
const extractProfileImageUrl = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        const v = value as Record<string, any>;
        return v.url || v.fileUrl || v.s3Url || '';
    }
    return '';
};

const useProfile = () => {
    const {
        initialized,
        isAuthenticated,
        getValidAccessToken,
        logout,
        authFetch,
        getRegions,
    } = useAuth() as {
        initialized: boolean;
        isAuthenticated: boolean;
        getValidAccessToken?: () => Promise<string | null>;
        logout: () => void;
        authFetch: (
            input: RequestInfo | URL,
            init?: RequestInit,
            opts?: { requireAuth?: boolean }
        ) => Promise<Response>;
        getRegions?: () => Promise<RegionItem[]>;
    };

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // 지역 API 캐시 & 참조
    const getRegionsRef = useRef(getRegions);
    useEffect(() => { getRegionsRef.current = getRegions; }, [getRegions]);
    const regionListCacheRef = useRef<RegionItem[] | null>(null);

    const flattenRegionsTree = (list: RegionItem[]): RegionItem[] => {
        if (!Array.isArray(list)) return [];
        if (!list.some(n => Array.isArray(n.children) && n.children.length)) {
            return list;
        }
        const flat: RegionItem[] = [];
        const stack = [...list];
        while (stack.length) {
            const n = stack.pop()!;
            flat.push({ id: n.id, name: n.name, parentId: n.parentId });
            if (n.children?.length) stack.push(...n.children);
        }
        return flat;
    };

    // regionId → (시/도, 구/군/시, full) 계산
    const resolveRegionNames = useCallback(
        async (regionId?: string | null, fallbackName?: string) => {
            if (!regionId) {
                const district = fallbackName || '';
                return { city: '', district, full: district };
            }

            try {
                const raw = regionListCacheRef.current || (await getRegionsRef.current?.());
                if (!raw || !raw.length) {
                    const district = fallbackName || '';
                    return { city: '', district, full: district };
                }
                regionListCacheRef.current = raw;

                const flat = flattenRegionsTree(raw);
                const node = flat.find(r => r.id === regionId);
                if (!node) {
                    const district = fallbackName || '';
                    return { city: '', district, full: district };
                }
                const parent = node.parentId ? flat.find(r => r.id === node.parentId) : undefined;
                const city = parent?.name ?? '';
                const district = node.name;
                const full = city ? `${city} ${district}` : district;
                return { city, district, full };
            } catch {
                const district = fallbackName || '';
                return { city: '', district, full: district };
            }
        },
        []
    );

    // 마운트 후 1회 로드 가드
    const hasLoadedRef = useRef(false);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token =
                (await getValidAccessToken?.()) ?? localStorage.getItem('accessToken');

            if (!token) {
                setProfile(null);
                setError('로그인이 필요합니다.');
                return;
            }

            const res = await fetch(`${API_BASE}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.status === 401) {
                setProfile(null);
                setError('세션이 만료되었습니다. 다시 로그인해주세요.');
                return;
            }
            if (res.status === 403) {
                setProfile(null);
                setError('접근 권한이 없습니다.');
                return;
            }
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || `프로필 조회 실패 (${res.status})`);
            }

            const raw = (await res.json()) as any;

            // 이미지 URL 정규화
            const normalizedImageUrl = extractProfileImageUrl(raw?.profileImage);

            // 지역 풀네임 계산
            const regionId = raw?.region?.id ?? raw?.region_id ?? null;
            const fallbackName = raw?.region?.name ?? '';
            const names = await resolveRegionNames(regionId, fallbackName);

            const data: Profile = {
                ...raw,
                profileImage: normalizedImageUrl,
                regionCityName: names.city,
                regionDistrictName: names.district,
                regionFullName: names.full,
            };

            setProfile(data);
        } catch (e: any) {
            console.error('[useProfile] loadProfile error:', e);
            setError(e?.message ?? '프로필 정보를 불러오지 못했습니다.');
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, [getValidAccessToken, resolveRegionNames]);

    /** 현재 프로필과 payload를 비교해 변경된 값만 추출 */
    const computeDelta = (
        base: Profile | null,
        nextPayload: UpdateProfilePayload
    ): UpdateProfilePayload => {
        const delta: UpdateProfilePayload = {};
        if (!base) return nextPayload;

        const curRegionId = base.region?.id ?? base.region_id ?? '';

        if (typeof nextPayload.username !== 'undefined' && nextPayload.username !== base.username) {
            delta.username = nextPayload.username;
        }
        if (typeof nextPayload.phoneNumber !== 'undefined' && nextPayload.phoneNumber !== (base.phoneNumber ?? '')) {
            delta.phoneNumber = nextPayload.phoneNumber;
        }
        if (typeof nextPayload.region_id !== 'undefined' && nextPayload.region_id !== curRegionId) {
            delta.region_id = nextPayload.region_id;
        }

        /** ✅ 이미지 변경 의도만 전달 (임시파일 id 또는 null, 변경 없음은 undefined → 미포함) */
        if (typeof nextPayload.profileImageId !== 'undefined') {
            delta.profileImageId = nextPayload.profileImageId;
        }

        if (typeof nextPayload.password === 'string' && nextPayload.password.length > 0) {
            delta.password = nextPayload.password;
        }

        return delta;
    };

    /** 프로필 업데이트 (PATCH /api/users/me)
     *  - 변경된 필드만 전송 (이미지는 profileImageId 사용)
     *  - 응답의 profileImage를 URL 문자열로 정규화
     *  - 응답에도 지역 풀네임 계산해서 profile에 저장
     */
    const updateProfile = useCallback(
        async (payload: UpdateProfilePayload): Promise<Profile> => {
            const delta = computeDelta(profile, payload);
            if (!delta || Object.keys(delta).length === 0) {
                return profile as Profile;
            }

            const token =
                (await getValidAccessToken?.()) ?? localStorage.getItem('accessToken');

            if (!token) {
                throw new Error('로그인이 필요합니다.');
            }

            const res = await fetch(`${API_BASE}/api/users/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(delta),
            });

            if (res.status === 401) {
                throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
            }
            if (res.status === 403) {
                throw new Error('접근 권한이 없습니다.');
            }
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || `프로필 수정 실패 (${res.status})`);
            }

            const raw = (await res.json()) as any;

            // 응답 이미지 URL 정규화
            const normalizedImageUrl = extractProfileImageUrl(raw?.profileImage);

            // 지역 풀네임 재계산
            const regionId = raw?.region?.id ?? raw?.region_id ?? null;
            const fallbackName = raw?.region?.name ?? '';
            const names = await resolveRegionNames(regionId, fallbackName);

            const data: Profile = {
                ...raw,
                profileImage: normalizedImageUrl,
                regionCityName: names.city,
                regionDistrictName: names.district,
                regionFullName: names.full,
            };

            setProfile(data);
            return data;
        },
        [getValidAccessToken, profile, resolveRegionNames]
    );

    useEffect(() => {
        if (!initialized) return;

        if (!isAuthenticated) {
            setProfile(null);
            setError(null);
            hasLoadedRef.current = false;
            return;
        }

        if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            void loadProfile();
        }
    }, [initialized, isAuthenticated, loadProfile]);

    return {
        profile,
        loading,
        error,
        loadProfile,
        setProfile,
        updateProfile,
    };
};

export default useProfile;
