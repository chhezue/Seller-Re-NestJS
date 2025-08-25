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
    if (limit) params.set('limit', String(limit));          // ⬅️ limit=20 송부

    return params.toString();
};

/* =========================
 *  등록/삭제 등 액션 훅
 * ========================= */

export type CreateProductPayload = {
    name: string;
    description: string;
    categoryId: string;
    price: number;
    status: string;
    tradeType: string;
    condition: string;
    isNegotiable: boolean;
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

        const res = await fetch(`${API_BASE}/api/product/${productId}`, {
            method: 'DELETE',
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

    /** ❤️ 찜 토글 (여러 백엔드 패턴 지원) */
    const toggleFavorite = async (productId: string) => {
        const headers = withAuthHeaders();

        const candidates = [
            `${API_BASE}/api/product/${productId}/favorite/toggle`,
            `${API_BASE}/api/product/${productId}/favorite`,
        ] as const;

        let lastErr: any = null;

        for (const url of candidates) {
            try {
                const res = await fetch(url, { method: 'POST', headers });
                if (res.ok) {
                    // 응답이 { isFavorited, favoriteCount } 형태라고 가정
                    const data = await res.json().catch(() => ({}));
                    return {
                        isFavorited: Boolean((data as any)?.isFavorited),
                        favoriteCount:
                            typeof (data as any)?.favoriteCount === 'number'
                                ? (data as any).favoriteCount
                                : undefined,
                    };
                }
                // 404면 다음 후보 시도
                if (res.status === 404) {
                    continue;
                }
                const text = await res.text().catch(() => '');
                throw new Error(text || `찜 처리 실패 (${res.status})`);
            } catch (e) {
                lastErr = e;
            }
        }

        // 모든 후보 실패
        if (lastErr) throw lastErr;
        throw new Error('찜 API 엔드포인트를 찾을 수 없습니다.');
    };

    return { createProduct, updateProduct, deleteProduct, toggleFavorite };
};

/* =========================
 *  단건 조회 훅
 * ========================= */
export const useProductDetail = (id?: string) => {
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [errorStatus, setErrorStatus] = useState<number | null>(null);

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
                return;
            }

            const data = (await res.json()) as Product;
            setProduct(data);
        } catch (e: any) {
            setError(e?.message ?? '상품을 불러오지 못했습니다.');
            setErrorStatus(null);
            setProduct(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchOne();
    }, [fetchOne]);

    return { product, loading, error, errorStatus, refresh: fetchOne };
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
const PAGE_SIZE = 20;                             // ✅ 페이지 크기 20으로 고정

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
            out.push(n);              // 새 항목 추가
        } else {
            out[i] = n;               // 기존 항목 최신값으로 교체(업서트)
        }
    }
    return out;
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

                if (filters.myOnly) {
                    // 판매중 → 예약중 → 판매완료
                    const order: Record<string, number> = { ON_SALE: 0, RESERVED: 1, SOLD: 2 };
                    list = list.sort((a, b) => {
                        const s = (order[a.status] ?? 99) - (order[b.status] ?? 99);
                        if (s !== 0) return s;
                        const ad = a.updatedAt ?? a.createdAt;
                        const bd = b.updatedAt ?? b.createdAt;
                        return (bd ? new Date(bd).getTime() : 0) - (ad ? new Date(ad).getTime() : 0);
                    });
                }

                // ✅ 이전 페이지와 합칠 때 id 기준 업서트 → key 중복 제거
                setProducts((prev) => (append ? mergeUniqueById(prev, list) : dedupById(list)));
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
                    // 비로그인 상태면 0으로 처리
                    if (!cancelled) setCount(0);
                    return;
                }

                const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                };

                let cursor: string | undefined = undefined;
                let total = 0;

                // 한 번에 너무 많이 받지 않도록 페이지당 200개 정도로 페이징
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
 *  🔥 인기 상품 훅 (조회수 기준/없으면 최신순)
 * ========================= */
/* =========================
 *  🔥 인기 상품 훅 (조회수 우선, 동률이면 최신순)
 * ========================= */
export type PopularOptions = {
    limit?: number;           // 기본 12개
    status?: string;          // 기본 'ON_SALE'
    excludeId?: string;       // 제외할 상품 (상세 페이지의 현재 상품 등)

    // ✅ 호환용: 외부에서 넘겨도 여기서는 사용하지 않음 (무시)
    region?: string;          // (ignored)
    categoryId?: string;      // (ignored)
};

export const usePopularProducts = (opts: PopularOptions = {}) => {
    const {
        limit = 12,
        status = 'ON_SALE',
        excludeId,
        // region, categoryId 는 의도적으로 받기만 하고 사용하지 않음(호환)
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

            // ✅ 지역/카테고리 필터 완전 제거: 전체 목록 + (선택) 상태만 적용
            const filters: Filters = {
                ...(status ? { status } : {}),
            };

            const qs = buildQuery(filters, '', undefined, limit);
            const url = `${API_BASE}/api/product${qs ? `?${qs}` : ''}`;

            const res = await fetch(url, { headers });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || `인기 상품 조회 실패 (${res.status})`);
            }

            const data = (await res.json()) as ApiCursorResponse;
            let { list } = normalize(data);

            // 현재 상품 제외
            if (excludeId) {
                list = list.filter((p) => p.id !== excludeId);
            }

            // ✅ 정렬: viewCount 내림차순 → 동률이면 최신순
            list.sort((a, b) => {
                const av = typeof a.viewCount === 'number' ? a.viewCount : -1;
                const bv = typeof b.viewCount === 'number' ? b.viewCount : -1;
                if (bv !== av) return bv - av; // 조회수 우선
                const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
                const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
                return bd - ad; // 동률이면 최신순
            });

            setPopular(list.slice(0, limit));
        } catch (e: any) {
            setPopularError(e?.message ?? '인기 상품을 불러오지 못했습니다.');
            setPopular([]);
        } finally {
            setPopularLoading(false);
        }
    }, [limit, status, excludeId]);

    useEffect(() => {
        fetchPopular();
    }, [fetchPopular]);

    return {
        popular,
        popularLoading,
        popularError,
        refreshPopular: fetchPopular,
    };
};

