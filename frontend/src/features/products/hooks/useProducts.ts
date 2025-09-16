// features/products/hooks/useProducts.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = 'http://127.0.0.1:3000';

export type RegionRef = {
    id: string;
    name: string;
    parentId?: string | null;
};

export type Product = {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    description?: string;
    isNegotiable?: boolean;
    viewCount?: number;
    favoriteCount?: number;
    tradeType: string;
    status: string;
    condition?: string;
    category?: { id: string; name?: string };
    author?: { id: string; username?: string; profileImage?: string; region?: RegionRef | null; ratingAvg?: number; ratingCount?: number };
    updatedAt?: string;
    createdAt: string;
    region?: RegionRef | null;
};

/** ✅ 정렬 키 (프론트 전용) */
export type SortKey = 'latest' | 'popular' | 'lowPrice' | 'highPrice';

export type Filters = {
    /** ✅ 서버 전송용: 지역 id */
    region?: string;
    /** UI 표시용 (옵션) */
    regionLabel?: string;

    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    shareOnly?: boolean;
    myOnly?: boolean;
    status?: string;
    tradeType?: string;
    condition?: string;
    isNegotiable?: boolean;

    /** ✅ 프론트 전용 정렬 키(서버에는 보내지 않음) */
    sortKey?: SortKey;
};

type ApiCursorResponse =
    | { products: Product[]; nextCursor?: string }
    | { items: Product[]; nextCursor?: string }
    | { products: Product[]; cursor?: string }
    | Product[];

const normalize = (data: ApiCursorResponse) => {
    let list: Product[] = [];
    let next: string | undefined;

    if (Array.isArray(data)) {
        list = data;
    } else if ('products' in data) {
        list = (data as any).products ?? [];
        next = (data as any).nextCursor ?? (data as any).cursor;
    } else if ('items' in data) {
        list = (data as any).items ?? [];
        next = (data as any).nextCursor;
    }
    return { list, nextCursor: next };
};

const buildQuery = (filters: Filters, keyword: string, cursor?: string, limit?: number) => {
    const params = new URLSearchParams();

    // region → regionId 로 전송
    if (filters.region) params.set('regionId', filters.region);

    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.shareOnly) params.set('tradeType', 'SHARE');
    else if (filters.tradeType) params.set('tradeType', filters.tradeType);

    if (filters.status) params.set('status', filters.status);
    if (filters.condition) params.set('condition', filters.condition);
    if (typeof filters.isNegotiable === 'boolean') params.set('isNegotiable', String(filters.isNegotiable));

    if (typeof filters.minPrice === 'number') params.set('minPrice', String(filters.minPrice));
    if (typeof filters.maxPrice === 'number') params.set('maxPrice', String(filters.maxPrice));

    if (keyword.trim()) params.set('keyword', keyword.trim());
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', String(limit)); // ⬅️ limit 송부

    // ❌ sortKey는 서버가 받지 않으므로 쿼리에 넣지 않음
    return params.toString();
};

/* =========================
 *  등록/삭제 등 액션 훅
 * ========================= */

/** ✅ 서버 제출 스펙에 맞춰 수정: tempId → fileId */
export type ImageInput = {
    fileId: string;
    order: number;
    isRepresentative: boolean;
};

export type CreateProductPayload = {
    name: string;
    description: string;
    categoryId: string;
    price: number;
    status: string;
    tradeType: string;
    condition: string;
    isNegotiable: boolean;
    images?: ImageInput[]; // ✅ fileId/order/isRepresentative
};

export type UpdateProductPayload = CreateProductPayload;

export const useProductActions = () => {
    const withAuthHeaders = () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            const err = new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
            (err as any).code = 'NOT_AUTHENTICATED';
            throw err;
        }
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        } as HeadersInit;
    };

    /* =========================
     *  ✅ 임시 이미지 업로드 (서버 명세)
     *   - Endpoint: POST /uploads/temp
     *   - Request: multipart/form-data (field name = 'file')
     *   - Response: 201 { id, tempUrl }
     * ========================= */

    // ✅ 단건도 'files' 필드로 전송
    const uploadTempImage = async (file: File): Promise<{ id: string; tempUrl: string }> => {
        const form = new FormData();
        form.append('files', file, file.name); // ← 반드시 'files'

        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        const candidates = [
            `${API_BASE}/api/uploads/temp`,
            `${API_BASE}/uploads/temp`,
        ] as const;

        let lastErr: any = null;
        for (const url of candidates) {
            try {
                const res = await fetch(url, { method: 'POST', headers, body: form });
                if (!res.ok) {
                    const txt = await res.text().catch(() => '');
                    throw new Error(txt || `임시 업로드 실패 (${res.status})`);
                }
                const data: any = await res.json().catch(() => ({}));
                const item = Array.isArray(data) ? data[0] : data;
                if (item?.id && item?.tempUrl) return { id: item.id, tempUrl: item.tempUrl };
                throw new Error('임시 업로드 응답 형식이 올바르지 않습니다. (id/tempUrl 누락)');
            } catch (e) {
                lastErr = e;
            }
        }
        throw lastErr || new Error('임시 업로드 엔드포인트를 찾을 수 없습니다.');
    };

    // ✅ 여러 장도 'files' 필드로 전송 (배치) — 필요 시 단건 병렬 폴백
    const uploadTempImages = async (
        files: File[]
    ): Promise<Array<{ id: string; tempUrl: string }>> => {
        if (!files || files.length === 0) return [];

        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const form = new FormData();
            files.forEach((f) => form.append('files', f, f.name)); // ← 반드시 'files'

            const res = await fetch(`${API_BASE}/api/uploads/temp`, {
                method: 'POST',
                headers, // Content-Type는 브라우저가 설정
                body: form,
            });

            if (!res.ok) {
                const txt = await res.text().catch(() => '');
                throw new Error(txt || `임시 업로드(배치) 실패 (${res.status})`);
            }

            const data: any = await res.json().catch(() => ({}));
            const items: any[] =
                Array.isArray(data)
                    ? data
                    : Array.isArray(data?.items)
                    ? data.items
                    : (data?.id && data?.tempUrl)
                    ? [data]
                    : [];

            // 단건/배치 모두 배열로 정규화
            return items.map((it) => {
                if (!it?.id || !it?.tempUrl) {
                    throw new Error('임시 업로드 응답 형식이 올바르지 않습니다. (id/tempUrl 누락)');
                }
                return { id: it.id, tempUrl: it.tempUrl };
            });
        } catch {
            // 배치가 안 되면 단건('files' 필드) 병렬 폴백
            return Promise.all(files.map(uploadTempImage));
        }
    };

    const createProduct = async (payload: CreateProductPayload) => {
        const headers = withAuthHeaders();

        const res = await fetch(`${API_BASE}/api/product`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const err = new Error(text || `상품 등록 실패 (${res.status})`);
            (err as any).status = res.status;
            throw err;
        }

        return (await res.json()) as Product;
    };

    const updateProduct = async (id: string, payload: UpdateProductPayload) => {
        const headers = withAuthHeaders();

        const res = await fetch(`${API_BASE}/api/product/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const err = new Error(text || `상품 수정 실패 (${res.status})`);
            (err as any).status = res.status;
            throw err;
        }

        return (await res.json()) as Product;
    };

    const deleteProduct = async (productId: string) => {
        const headers = withAuthHeaders();

        const res = await fetch(`${API_BASE}/api/product/delete/${productId}`, {
            method: 'PATCH',
            headers,
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const err = new Error(text || `상품 삭제 실패 (${res.status})`);
            (err as any).status = res.status;
            throw err;
        }

        return true;
    };


    /** ❤️ 찜 토글 (신규: POST/DELETE /api/likes/:productId) */
    type FavoriteToggleResult = {
        isFavorited: boolean;
        favoriteCount: number;
    };

    // ⬇️ 현재 상태/카운트를 옵션으로 받게 수정
    const toggleFavorite = async (
        productId: string,
        opts: { currentlyFavorited?: boolean; currentCount?: number } = {}
    ): Promise<FavoriteToggleResult> => {
        const { currentlyFavorited, currentCount } = opts;
        const headers = withAuthHeaders();
        const likeUrl = `${API_BASE}/api/likes/${productId}`;

        const tryLike = async (): Promise<FavoriteToggleResult> => {
            const res = await fetch(likeUrl, { method: 'POST', headers });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                const server = typeof (data as any)?.favoriteCount === 'number' ? (data as any).favoriteCount : undefined;
                const count = server ?? Math.max(0, (currentCount ?? 0) + 1); // 👈 서버값 없으면 +1
                return { isFavorited: true, favoriteCount: count };
            }
            if ([400, 405, 409].includes(res.status)) {
                // 이미 좋아요 상태일 수 있으니 해제 시도
                return tryUnlike();
            }
            const text = await res.text().catch(() => '');
            throw new Error(text || `찜 처리 실패 (${res.status})`);
        };

        const tryUnlike = async (): Promise<FavoriteToggleResult> => {
            const res = await fetch(likeUrl, { method: 'DELETE', headers });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                const server = typeof (data as any)?.favoriteCount === 'number' ? (data as any).favoriteCount : undefined;
                const count = server ?? Math.max(0, (currentCount ?? 0) - 1); // 👈 서버값 없으면 -1
                return { isFavorited: false, favoriteCount: count };
            }
            if ([400, 404, 405].includes(res.status)) {
                // 이미 해제 상태일 수 있으니 등록 시도
                return tryLike();
            }
            const text = await res.text().catch(() => '');
            throw new Error(text || `찜 해제 실패 (${res.status})`);
        };

        if (typeof currentlyFavorited === 'boolean') {
            return currentlyFavorited ? await tryUnlike() : await tryLike();
        }
        return await tryLike();
    };

    return { createProduct, updateProduct, deleteProduct, toggleFavorite, uploadTempImages, uploadTempImage };
};

/* =========================
 *  단건 조회 훅 + 판매자 다른 상품 (limit=4, cursor 기반)
 * ========================= */
export const useProductDetail = (id?: string) => {
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [errorStatus, setErrorStatus] = useState<number | null>(null);

    // ▼ 판매자 다른 상품 상태 (cursor 기반)
    const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
    const [sellerLoading, setSellerLoading] = useState<boolean>(false);
    const [sellerLoadingMore, setSellerLoadingMore] = useState<boolean>(false);
    const [sellerError, setSellerError] = useState<string>('');
    const [sellerNextCursor, setSellerNextCursor] = useState<string | null>(null);
    const [sellerHasMore, setSellerHasMore] = useState<boolean>(true);

    const fetchSellerProducts = useCallback(
        async (opts: {
            sellerId?: string;
            excludeId?: string;
            cursor?: string;
            append?: boolean;
            limit?: number; // 기본 4
        }) => {
            const {
                sellerId,
                excludeId,
                cursor,
                append = false,
                limit = 4, // ✅ 요구사항: 4개씩
            } = opts || {};

            if (!sellerId) {
                setSellerProducts([]);
                setSellerNextCursor(null);
                setSellerHasMore(false);
                return;
            }

            if (append) setSellerLoadingMore(true);
            else {
                setSellerLoading(true);
                setSellerError('');
            }

            try {
                const token = localStorage.getItem('accessToken');
                const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                };

                const params = new URLSearchParams();
                params.set('limit', String(limit));
                if (cursor) params.set('cursor', cursor);
                

                // 환경별 엔드포인트 후보
                const candidates = [
                    `${API_BASE}/api/product/user-sales/${sellerId}`,
                    `${API_BASE}/product/user-sales/${sellerId}`,
                ] as const;

                let data: ApiCursorResponse | null = null;
                let lastErr: any = null;

                for (const base of candidates) {
                    const url = `${base}${params.toString() ? `?${params.toString()}` : ''}`;
                    try {
                        const res = await fetch(url, { headers });
                        if (!res.ok) {
                            const txt = await res.text().catch(() => '');
                            throw new Error(txt || `판매자 상품 조회 실패 (${res.status})`);
                        }
                        data = (await res.json()) as ApiCursorResponse;
                        break; // 성공
                    } catch (e) {
                        lastErr = e;
                    }
                }

                if (!data) throw lastErr || new Error('판매자 상품 API를 찾을 수 없습니다.');

                // 응답 정규화
                let { list, nextCursor } = normalize(data);

                // 🔻 SOLD 제외 (필터링 추가)
                list = list.filter((p) => p.status !== 'SOLD');

                // 현재 상세 상품 제외
                const filtered = excludeId ? list.filter((p) => p.id !== excludeId) : list;

                // 합치고 중복 제거
                setSellerProducts((prev) =>
                    append ? dedupById([...prev, ...filtered]) : dedupById(filtered)
                );

                setSellerNextCursor(nextCursor ?? null);
                setSellerHasMore(Boolean(nextCursor));
            } catch (e: any) {
                setSellerError(e?.message ?? '판매자의 다른 상품을 불러오지 못했습니다.');
                if (!append) {
                    setSellerProducts([]);
                    setSellerNextCursor(null);
                    setSellerHasMore(false);
                }
            } finally {
                if (append) setSellerLoadingMore(false);
                else setSellerLoading(false);
            }
        },
        []
    );

    // ▼ 상세 진입 시 조회수 증가 (중복 방지)
    const sentViewsRef = useRef<Set<string>>(new Set());

   // 조회수 증가 useEffect 수정
    useEffect(() => {
        if (!id) return;
        if (sentViewsRef.current.has(id)) return; // ✅ 중복 방지
        sentViewsRef.current.add(id);

        const url = `${API_BASE}/api/product/${id}/view`;
        
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const bumpLocal = () => {
            setProduct(prev =>
                prev ? { ...prev, viewCount: Math.max(0, (prev.viewCount ?? 0) + 1) } : prev
            );
        };

        // 토큰 없을 때만 sendBeacon, 있으면 fetch (401 방지)
        if (!token && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
            try {
                const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
                (navigator as any).sendBeacon(url, blob);
                bumpLocal();
                return;
            } catch { /* ignore */ }
        }

        fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
            keepalive: true,
        })
        .then(() => bumpLocal())
        .catch(() => { /* 필요 시 로깅 */ });
    }, [id]);

    const fetchOne = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError('');
        setErrorStatus(null);

        try {
            const token = localStorage.getItem('accessToken');
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };

            const res = await fetch(`${API_BASE}/api/product/${id}`, { headers });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                setError(text || `상품 조회 실패 (${res.status})`);
                setErrorStatus(res.status);
                setProduct(null);

                // 판매자 목록도 초기화
                setSellerProducts([]);
                setSellerNextCursor(null);
                setSellerHasMore(false);
                return;
            }

            const data = (await res.json()) as Product;
            setProduct(data);

            // ✅ 상품 로드 후 판매자 다른 상품 첫 페이지(limit=4)
            const sellerId = data?.author?.id || (data as any)?.authorId;
            await fetchSellerProducts({
                sellerId,
                excludeId: data?.id,
                cursor: undefined,
                append: false,
                limit: 4,
            });
        } catch (e: any) {
            setError(e?.message ?? '상품을 불러오지 못했습니다.');
            setErrorStatus(null);
            setProduct(null);

            setSellerProducts([]);
            setSellerNextCursor(null);
            setSellerHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [id, fetchSellerProducts]);

    useEffect(() => {
        fetchOne();
    }, [fetchOne]);

    // ▼ "더보기" (cursor 기반)
    const loadMoreSeller = useCallback(() => {
        if (sellerLoading || sellerLoadingMore) return;
        if (!sellerHasMore || !sellerNextCursor) return;

        const sellerId = product?.author?.id || (product as any)?.authorId;
        fetchSellerProducts({
            sellerId,
            excludeId: product?.id,
            cursor: sellerNextCursor,
            append: true,
            limit: 4, // 계속 4개씩
        });
    }, [
        product?.author?.id,
        (product as any)?.authorId,
        product?.id,
        sellerHasMore,
        sellerNextCursor,
        sellerLoading,
        sellerLoadingMore,
        fetchSellerProducts,
    ]);

    return {
        product,
        loading,
        error,
        errorStatus,
        refresh: fetchOne,

        // ▼ 판매자 다른 상품
        sellerProducts,
        sellerLoading,
        sellerLoadingMore,
        sellerError,
        sellerHasMore,

        // ▼ 더보기
        loadMoreSeller,
    };
};

/* =========================
 *  옵션(enums) 훅
 * ========================= */
export type OptionItem = { key: string; label: string };
export type EnumResponse = {
    status: OptionItem[];
    tradeType: OptionItem[];
    condition: OptionItem[];
};

export const useProductEnums = () => {
    const [statusOptions, setStatusOptions] = useState<OptionItem[]>([]);
    const [tradeTypeOptions, setTradeTypeOptions] = useState<OptionItem[]>([]);
    const [conditionOptions, setConditionOptions] = useState<OptionItem[]>([]);
    const [loadingEnums, setLoadingEnums] = useState<boolean>(false);
    const [enumsError, setEnumsError] = useState<string>('');

    const fetchEnums = useCallback(async () => {
        setLoadingEnums(true);
        setEnumsError('');
        try {
            const res = await fetch(`${API_BASE}/api/product/enums`);
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || `옵션 조회 실패 (${res.status})`);
            }
            const data = (await res.json()) as EnumResponse;
            setStatusOptions(data.status || []);
            setTradeTypeOptions(data.tradeType || []);
            setConditionOptions(data.condition || []);
        } catch (e: any) {
            setEnumsError(e?.message ?? '상품 옵션 정보를 불러오지 못했습니다.');
            setStatusOptions([]);
            setTradeTypeOptions([]);
            setConditionOptions([]);
        } finally {
            setLoadingEnums(false);
        }
    }, []);

    useEffect(() => {
        fetchEnums();
    }, [fetchEnums]);

    return {
        statusOptions,
        tradeTypeOptions,
        conditionOptions,
        loadingEnums,
        enumsError,
        refreshEnums: fetchEnums,
    };
};

/* =========================
 *  목록/검색 훅 (기본 내보내기)
 * ========================= */
const PAGE_SIZE = 20; // ✅ 페이지 크기 20으로 고정

// ✅ 중복 제거 & 업서트 유틸
const dedupById = (arr: Product[]) => {
    const seen = new Set<string>();
    const out: Product[] = [];
    for (const p of arr) {
        if (!seen.has(p.id)) {
            seen.add(p.id);
            out.push(p);
        }
    }
    return out;
};

const mergeUniqueById = (prev: Product[], next: Product[]) => {
    if (prev.length === 0) return dedupById(next);
    const indexById = new Map(prev.map((p, i) => [p.id, i]));
    const out = prev.slice();
    for (const n of next) {
        const i = indexById.get(n.id);
        if (i == null) {
            indexById.set(n.id, out.length);
            out.push(n); // 새 항목 추가
        } else {
            out[i] = n; // 기존 항목 최신값으로 교체(업서트)
        }
    }
    return out;
};

/** ✅ 안전한 날짜 숫자 변환 */
const dateNum = (p: Product) =>
    new Date(p.createdAt || 0).getTime() || 0;

/** ✅ 클라이언트 정렬 함수 */
const applySort = (list: Product[], sortKey?: SortKey, myOnly?: boolean) => {
    // 내 판매상품에서는 상태 우선 정렬 유지
    if (myOnly) {
        const order: Record<string, number> = { ON_SALE: 0, RESERVED: 1, SOLD: 2 };
        return list.slice().sort((a, b) => {
            const s = (order[a.status] ?? 99) - (order[b.status] ?? 99);
            if (s !== 0) return s;
            return dateNum(b) - dateNum(a);
        });
    }

    const key = sortKey ?? 'latest';
    if (key === 'latest') {
        return list.slice().sort((a, b) => dateNum(b) - dateNum(a));
    }
    if (key === 'highPrice') {
        return list.slice().sort((a, b) => {
            if (b.price !== a.price) return b.price - a.price;
            return dateNum(b) - dateNum(a); // ← createdAt 기준
        });
    }
    if (key === 'lowPrice') {
        return list.slice().sort((a, b) => {
            if (a.price !== b.price) return a.price - b.price;
            return dateNum(b) - dateNum(a); // ← createdAt 기준
        });
    }
    // popular: 찜 → 조회수 → 최신
    return list.slice().sort((a, b) => {
        const af = typeof a.favoriteCount === 'number' ? a.favoriteCount : -1;
        const bf = typeof b.favoriteCount === 'number' ? b.favoriteCount : -1;
        if (bf !== af) return bf - af;

        const av = typeof a.viewCount === 'number' ? a.viewCount : -1;
        const bv = typeof b.viewCount === 'number' ? b.viewCount : -1;
        if (bv !== av) return bv - av;

        return dateNum(b) - dateNum(a);
    });
};

const useProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const [filters, setFiltersState] = useState<Filters>({});
    const [searchKeyword, setSearchKeyword] = useState<string>('');

    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState<boolean>(true);

    const mounted = useRef<boolean>(false);

    const fetchPage = useCallback(
        async (opts: { cursor?: string; append?: boolean } = {}) => {
            const { cursor, append } = opts;

            if (append) setLoadingMore(true);
            else {
                setLoading(true);
                setError('');
            }

            try {
                const token = localStorage.getItem('accessToken');
                const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                };

                const basePath = filters.myOnly ? '/api/product/my-sales' : '/api/product';

                if (filters.myOnly && !token) {
                    setProducts([]);
                    setHasMore(false);
                    setNextCursor(null);
                    throw new Error('로그인이 필요합니다.');
                }

                const qs = buildQuery(filters, searchKeyword, cursor, PAGE_SIZE);
                const url = `${API_BASE}${basePath}${qs ? `?${qs}` : ''}`;

                const res = await fetch(url, { headers });
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new Error(text || `상품 목록 조회 실패 (${res.status})`);
                }

                const data = (await res.json()) as ApiCursorResponse;
                let { list, nextCursor: serverNext } = normalize(data);

                // ✅ 단일 응답 내에서도 혹시 모를 중복 제거
                list = dedupById(list);

                // ✅ 이전 페이지와 합쳐서 정렬 적용
                setProducts((prev) => {
                    const merged = append ? mergeUniqueById(prev, list) : dedupById(list);
                    return applySort(merged, filters.sortKey, filters.myOnly);
                });

                setNextCursor(serverNext ?? null);
                setHasMore(Boolean(serverNext));
            } catch (e: any) {
                console.error('[useProducts] fetchPage error:', e);
                setError(e?.message ?? '상품 목록을 불러오지 못했습니다.');
                if (!append) {
                    setProducts([]);
                    setHasMore(false);
                    setNextCursor(null);
                }
            } finally {
                if (append) setLoadingMore(false);
                else setLoading(false);
            }
        },
        [filters, searchKeyword]
    );

    // 초기/필터/검색어 변경 시 첫 페이지
    useEffect(() => {
        if (!mounted.current) mounted.current = true;
        setNextCursor(null);
        setHasMore(true);
        fetchPage({ append: false, cursor: undefined });
    }, [fetchPage]);

    const visibleProducts = useMemo(() => products, [products]);

    const loadMore = useCallback(() => {
        if (loading || loadingMore) return;
        if (!hasMore || !nextCursor) return;
        fetchPage({ append: true, cursor: nextCursor });
    }, [loading, loadingMore, hasMore, nextCursor, fetchPage]);

    const setFilters = useCallback(
        (next: Partial<Filters> | ((prev: Filters) => Partial<Filters>)) => {
            setFiltersState((prev) => {
                const patch = typeof next === 'function' ? next(prev) : next;
                return { ...prev, ...patch };
            });
        },
        []
    );

    const refresh = useCallback(() => {
        setNextCursor(null);
        setHasMore(true);
        fetchPage({ append: false, cursor: undefined });
    }, [fetchPage]);

    // ✅ 무한 스크롤: 화면 하단 근처 도달 시 자동으로 다음 페이지 로드
    useEffect(() => {
        const onScroll = () => {
            if (loading || loadingMore) return;
            if (!hasMore || !nextCursor) return;
            const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
            if (nearBottom) loadMore();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [loading, loadingMore, hasMore, nextCursor, loadMore]);

    return {
        products: visibleProducts,
        loading,
        loadingMore,
        hasMore,
        error,

        loadMore,
        refresh,

        filters,
        setFilters,
        searchKeyword,
        setSearchKeyword,
    };
};

export default useProducts;

// ✅ 내 판매 목록 전용 훅: 처음부터 /api/product/my-sales 로만 조회
export const useMySales = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState<boolean>(true);

    const fetchPage = useCallback(
        async (opts: { cursor?: string; append?: boolean } = {}) => {
            const { cursor, append } = opts;

            if (append) setLoadingMore(true);
            else {
                setLoading(true);
                setError('');
            }

            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    setProducts([]);
                    setHasMore(false);
                    setNextCursor(null);
                    throw new Error('로그인이 필요합니다.');
                }

                const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                };

                // 필요하면 쿼리 추가 가능 (limit/cursor 등)
                const qs = buildQuery({}, '', cursor, PAGE_SIZE);
                const url = `${API_BASE}/api/product/my-sales${qs ? `?${qs}` : ''}`;

                const res = await fetch(url, { headers });
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new Error(text || `내 판매 목록 조회 실패 (${res.status})`);
                }

                const data = (await res.json()) as ApiCursorResponse;
                let { list, nextCursor: serverNext } = normalize(data);

                // 단일 응답 중복 제거
                list = dedupById(list);

                // 기존 + 새 페이지 병합 후, myOnly 정렬 규칙 적용
                setProducts((prev) => {
                    const merged = append ? mergeUniqueById(prev, list) : dedupById(list);
                    // myOnly = true 상황 정렬: 상태 우선 → createdAt 최신
                    return applySort(merged, undefined, true);
                });

                setNextCursor(serverNext ?? null);
                setHasMore(Boolean(serverNext));
            } catch (e: any) {
                console.error('[useMySales] fetchPage error:', e);
                setError(e?.message ?? '내 판매 목록을 불러오지 못했습니다.');
                if (!append) {
                    setProducts([]);
                    setHasMore(false);
                    setNextCursor(null);
                }
            } finally {
                if (append) setLoadingMore(false);
                else setLoading(false);
            }
        },
        []
    );

    // 최초 로드
    useEffect(() => {
        setNextCursor(null);
        setHasMore(true);
        fetchPage({ append: false, cursor: undefined });
    }, [fetchPage]);

    const loadMore = useCallback(() => {
        if (loading || loadingMore) return;
        if (!hasMore || !nextCursor) return;
        fetchPage({ append: true, cursor: nextCursor });
    }, [loading, loadingMore, hasMore, nextCursor, fetchPage]);

    const refresh = useCallback(() => {
        setNextCursor(null);
        setHasMore(true);
        fetchPage({ append: false, cursor: undefined });
    }, [fetchPage]);

    return {
        products,
        loading,
        loadingMore,
        hasMore,
        error,
        loadMore,
        refresh,
    };
};



export const useMySalesCount = () => {
    const [count, setCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setLoading(true);
            setError('');
            setCount(null);

            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    if (!cancelled) setCount(0);
                    return;
                }

                const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                };

                let cursor: string | undefined = undefined;
                let total = 0;

                const PAGE = 200;

                do {
                    const params = new URLSearchParams();
                    params.set('limit', String(PAGE));
                    if (cursor) params.set('cursor', cursor);

                    const url = `${API_BASE}/api/product/my-sales?${params.toString()}`;
                    const res = await fetch(url, { headers });

                    if (!res.ok) {
                        const text = await res.text().catch(() => '');
                        throw new Error(text || `내 판매 목록 조회 실패 (${res.status})`);
                    }

                    const data = (await res.json()) as ApiCursorResponse;
                    const { list, nextCursor } = normalize(data);

                    total += Array.isArray(list) ? list.length : 0;
                    cursor = nextCursor;

                    if (cancelled) return;
                } while (cursor);

                if (!cancelled) setCount(total);
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.message ?? '내 판매 목록을 불러오지 못했습니다.');
                    setCount(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        run();
        return () => { cancelled = true; };
    }, []);

    return { count, loading, error };
};

export function useRevealOnScroll(once: boolean = true) {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        el.classList.add('is-visible');
                        if (once) io.unobserve(entry.target);
                    } else if (!once) {
                        el.classList.remove('is-visible');
                    }
                });
            },
            { threshold: 0.12 }
        );

        io.observe(el);
        return () => io.disconnect();
    }, [once]);

    return ref;
}

/* === 카테고리 훅 === */
export type Category = { id: string; name: string };
type CategoryApiResponse =
    | Category[]
    | { items: Category[] }
    | { categories: Category[] };

const normalizeCategories = (data: CategoryApiResponse): Category[] => {
    if (Array.isArray(data)) return data;
    if ((data as any)?.items) return (data as any).items;
    if ((data as any)?.categories) return (data as any).categories;
    return [];
};

export const useCategories = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [categoriesError, setCategoriesError] = useState('');

    const fetchCategories = useCallback(async () => {
        setLoadingCategories(true);
        setCategoriesError('');
        try {
            const res = await fetch(`${API_BASE}/api/common/category`);
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || `카테고리 조회 실패 (${res.status})`);
            }
            const data = (await res.json()) as CategoryApiResponse;
            const list = normalizeCategories(data);

            // (선택) 이름순 정렬
            list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
            setCategories(list);
        } catch (e: any) {
            setCategories([]);
            setCategoriesError(e?.message ?? '카테고리를 불러오지 못했습니다.');
        } finally {
            setLoadingCategories(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return {
        categories,
        loadingCategories,
        categoriesError,
        refreshCategories: fetchCategories,
    };
};

/* =========================
 *  🔥 인기 상품 훅 (조회수 우선, 동률이면 최신순)
 * ========================= */
export type PopularOptions = {
    limit?: number;           // 기본 12개
    status?: string;          // 기본 'ON_SALE'
    excludeId?: string;       // 제외할 상품 (상세 페이지의 현재 상품 등)

    // 호환용(무시)
    region?: string;
    categoryId?: string;
};

/* =========================
 *  🔥 인기 상품 훅 (views + likesCount, 동률이면 최신순)
 * ========================= */
export const usePopularProducts = (opts: PopularOptions = {}) => {
    const {
        limit = 12,
        status = 'ON_SALE',
        excludeId,
    } = opts;

    const [popular, setPopular] = useState<Product[]>([]);
    const [popularLoading, setPopularLoading] = useState<boolean>(false);
    const [popularError, setPopularError] = useState<string>('');

    const fetchPopular = useCallback(async () => {
        setPopularLoading(true);
        setPopularError('');

        try {
            const token = localStorage.getItem('accessToken');
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };

            const PER_PAGE = 200;
            let cursor: string | undefined = undefined;
            const all: Product[] = [];
            const seen = new Set<string>();

            const baseFilters: Filters = {
                ...(status ? { status } : {}),
            };

            do {
                const qs = buildQuery(baseFilters, '', cursor, PER_PAGE);
                const url = `${API_BASE}/api/product${qs ? `?${qs}` : ''}`;

                const res = await fetch(url, { headers });
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new Error(text || `인기 상품 조회 실패 (${res.status})`);
                }

                const data = (await res.json()) as ApiCursorResponse;
                const { list, nextCursor } = normalize(data);

                for (const p of list) {
                    if (!seen.has(p.id)) {
                        seen.add(p.id);
                        all.push(p);
                    }
                }

                cursor = nextCursor || undefined;
            } while (cursor);

            const filtered = excludeId ? all.filter((p) => p.id !== excludeId) : all;

            // score = views + likesCount, 동률이면 최신순
            filtered.sort((a, b) => {
                const av = Number((a as any).views ?? a.viewCount ?? 0);
                const bv = Number((b as any).views ?? b.viewCount ?? 0);
                const al = Number((a as any).likesCount ?? a.favoriteCount ?? 0);
                const bl = Number((b as any).likesCount ?? b.favoriteCount ?? 0);

                const ascore = av + al;
                const bscore = bv + bl;
                if (bscore !== ascore) return bscore - ascore;

                const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
                const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
                return bd - ad;
            });

            setPopular(filtered.slice(0, limit));
        } catch (e: any) {
            setPopularError(e?.message ?? '인기 상품을 불러오지 못했습니다.');
            setPopular([]);
        } finally {
            setPopularLoading(false);
        }
    }, [limit, status, excludeId]);

    useEffect(() => {
        // cleanup 반환하지 말고 그냥 호출
        fetchPopular();
    }, [fetchPopular]);

    return {
        popular,
        popularLoading,
        popularError,
        refreshPopular: fetchPopular,
    };
};

/* =========================
 *  내가 찜한 상품 목록 훅 (/api/likes/my)
 *  - 페이지네이션(nextCursor) 지원
 *  - 응답이 [{ product: {...} }] 형태면 product만 꺼내 Product[]로 정규화
 * ========================= */
type MyLikesApiResponse =
    | { products: Product[]; nextCursor?: string }
    | { items: Array<Product | { product: Product }>; nextCursor?: string }
    | Array<Product | { product: Product }>;

const normalizeMyLikes = (data: MyLikesApiResponse) => {
    let list: Product[] = [];
    let next: string | undefined;

    if (Array.isArray(data)) {
        list = data
            .map((x: any) => (x?.product ? x.product : x))
            .filter(Boolean);
    } else if ('products' in data) {
        list = (data as any).products ?? [];
        next = (data as any).nextCursor;
    } else if ('items' in data) {
        const arr = (data as any).items ?? [];
        list = arr.map((x: any) => (x?.product ? x.product : x)).filter(Boolean);
        next = (data as any).nextCursor;
    }

    // 중복 제거
    const seen = new Set<string>();
    list = list.filter(p => (p && !seen.has(p.id) ? (seen.add(p.id), true) : false));

    return { list, nextCursor: next ?? null };
};

export const useMyLikes = () => {
    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);

    const fetchPage = useCallback(async (append: boolean) => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setItems([]);
            setHasMore(false);
            setCursor(null);
            setError('로그인이 필요합니다.');
            return;
        }

        append ? setLoadingMore(true) : setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            params.set('limit', '30');
            if (append && cursor) params.set('cursor', cursor);

            const res = await fetch(`${API_BASE}/api/likes/my?${params.toString()}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const txt = await res.text().catch(() => '');
                throw new Error(txt || `찜 목록 조회 실패 (${res.status})`);
            }

            const data = (await res.json()) as MyLikesApiResponse;
            const { list, nextCursor } = normalizeMyLikes(data);

            setItems(prev => (append ? [...prev, ...list] : list));
            setCursor(nextCursor);
            setHasMore(Boolean(nextCursor));
        } catch (e: any) {
            setError(e?.message ?? '찜 목록을 불러오지 못했습니다.');
            if (!append) {
                setItems([]);
                setCursor(null);
                setHasMore(false);
            }
        } finally {
            append ? setLoadingMore(false) : setLoading(false);
        }
    }, [cursor]);

    useEffect(() => {
        setCursor(null);
        setHasMore(false);
        fetchPage(false);
    }, [fetchPage]);

    const loadMore = useCallback(() => {
        if (loading || loadingMore) return;
        if (!hasMore || !cursor) return;
        fetchPage(true);
    }, [loading, loadingMore, hasMore, cursor, fetchPage]);

    return { items, loading, loadingMore, error, hasMore, loadMore };
};



/* =========================
 *  ❤️ 내 찜 목록 훅 (GET /api/likes/my)
 *  - 커서 기반 페이지네이션
 *  - 응답이 [products] 이든 [likes{ product }] 이든 유연 처리
 * ========================= */
export const useMyLikesCount = () => {
    const [count, setCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setLoading(true);
            setError('');
            setCount(null);

            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    if (!cancelled) setCount(0);
                    return;
                }

                const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                };

                const PAGE = 200;
                let cursor: string | undefined = undefined;
                let total = 0;

                do {
                    const params = new URLSearchParams();
                    params.set('limit', String(PAGE));
                    if (cursor) params.set('cursor', cursor);

                    const url = `${API_BASE}/api/likes/my?${params.toString()}`;
                    const res = await fetch(url, { headers });

                    if (res.status === 401) {
                        if (!cancelled) {
                            setCount(0);
                            setError('로그인이 필요합니다.');
                        }
                        return;
                    }
                    if (!res.ok) {
                        const text = await res.text().catch(() => '');
                        throw new Error(text || `내 찜 목록 조회 실패 (${res.status})`);
                    }

                    const data: any = await res.json();

                    // 응답 정규화: items | products | 배열
                    const items: any[] = Array.isArray(data)
                        ? data
                        : Array.isArray(data?.items)
                        ? data.items
                        : Array.isArray(data?.products)
                        ? data.products
                        : [];

                    total += items.length;
                    cursor = data?.nextCursor || data?.cursor || undefined;

                    if (cancelled) return;
                } while (cursor);

                if (!cancelled) setCount(total);
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.message ?? '내 찜 목록을 불러오지 못했습니다.');
                    setCount(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, []);

    return { count, loading, error };
};