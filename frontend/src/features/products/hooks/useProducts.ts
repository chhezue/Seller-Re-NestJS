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
    author?: { id: string; name?: string; profileImage?: string; region?: RegionRef | null; ratingAvg?: number; ratingCount?: number };
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

    // ✅ 지역: region(=id)만 보냄
    if (filters.region) params.set('region', filters.region);

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
    if (limit) params.set('limit', String(limit));

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
    const createProduct = async (payload: CreateProductPayload) => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            const err = new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
            (err as any).code = 'NOT_AUTHENTICATED';
            throw err;
        }

        const res = await fetch(`${API_BASE}/api/product`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
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
        const token = localStorage.getItem('accessToken');
        if (!token) {
            const err = new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
            (err as any).code = 'NOT_AUTHENTICATED';
            throw err;
        }

        const res = await fetch(`${API_BASE}/api/product/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
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
        const token = localStorage.getItem('accessToken');
        if (!token) {
            const err = new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
            (err as any).code = 'NOT_AUTHENTICATED';
            throw err;
        }

        const res = await fetch(`${API_BASE}/api/product/${productId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const err = new Error(text || `상품 삭제 실패 (${res.status})`);
            (err as any).status = res.status;
            throw err;
        }

        return true;
    };

    // (선택) 찜 토글을 이 훅에서 제공한다면 여기에 추가
    return { createProduct, updateProduct, deleteProduct };
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
const PAGE_SIZE = 30;

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

                // (디버그) 호출 URL/필터 확인
                console.log('[useProducts] fetch URL:', url);
                console.log('[useProducts] filters:', filters, 'keyword:', searchKeyword, 'cursor:', cursor);

                const res = await fetch(url, { headers });
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new Error(text || `상품 목록 조회 실패 (${res.status})`);
                }

                const data = (await res.json()) as ApiCursorResponse;
                let { list, nextCursor: serverNext } = normalize(data);

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

                // 서버가 nextCursor를 안 줄 때 대비
                if (!serverNext && list.length > 0) {
                    const last = list[list.length - 1];
                    serverNext = last.createdAt ?? last.updatedAt;
                }

                setProducts((prev) => (append ? [...prev, ...list] : list));
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


// === 카테고리 훅 ===
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
