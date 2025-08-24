// features/products/components/ProductFilters.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './ProductFilters.css';
import CategoryDropdown from '../routes/CategoryDropdown';
import useAuth, { RegionItem } from '../../auth/hooks/useAuth';
import { useCategories } from '../hooks/useProducts';

const API_BASE = 'http://127.0.0.1:3000';
const REGION_STORE_KEY = 'filters:selectedRegion';

export type Filters = {
    /** ✅ 서버 전송용: 지역 id (구/시 또는 시/도) */
    regionId?: string;
    /** ✅ 호환용: useProducts 등에서 region 키를 기대할 수 있어 같이 전달 */
    region?: string;
    /** UI 표시용 이름 */
    regionLabel?: string;

    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    shareOnly?: boolean;
    myOnly?: boolean;
    status?: string; // 'ON_SALE' 등
};

type Props = {
    onCategorySelect: (categoryId: string) => void;
    onFiltersChange?: (filters: Filters) => void;
    onCategoryLabelChange?: (label: string) => void;
    onRegionTextChange?: (text: string) => void;
};

const ProductFilters: React.FC<Props> = ({
    onCategorySelect,
    onFiltersChange,
    onCategoryLabelChange,
    onRegionTextChange,
}) => {
    const location = useLocation();

    const { categories, loadingCategories, categoriesError } = useCategories();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

    // ✅ authFetch / isAuthenticated 사용
    const { getRegions, authFetch, isAuthenticated } = useAuth() as {
        getRegions: () => Promise<RegionItem[]>;
        authFetch: (
            input: RequestInfo | URL,
            init?: RequestInit,
            opts?: { requireAuth?: boolean }
        ) => Promise<Response>;
        isAuthenticated: boolean;
    };

    const [regions, setRegions] = useState<RegionItem[]>([]);
    const [regionLoading, setRegionLoading] = useState(false);
    const [regionError, setRegionError] = useState('');
    const [selectedCityId, setSelectedCityId] = useState('');         // 시/도 id
    const [selectedDistrictId, setSelectedDistrictId] = useState(''); // 구/군/시 id

    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [shareOnly, setShareOnly] = useState(false);
    const [activePreset, setActivePreset] = useState<'SHARE' | '5000' | '10000' | '20000' | null>(null);

    const [myOnly, setMyOnly] = useState(false);
    const [onSaleOnly, setOnSaleOnly] = useState(false);
    const isLoggedIn = Boolean(localStorage.getItem('accessToken'));

    const parsedMin = useMemo(
        () => (minPrice.trim() === '' ? undefined : Math.max(0, Number(minPrice.replace(/\D/g, '')))),
        [minPrice]
    );
    const parsedMax = useMemo(
        () => (maxPrice.trim() === '' ? undefined : Math.max(0, Number(maxPrice.replace(/\D/g, '')))),
        [maxPrice]
    );

    const getRegionsRef = useRef(getRegions);
    useEffect(() => { getRegionsRef.current = getRegions; }, [getRegions]);

    // 지역 목록 로드
    useEffect(() => {
        let aborted = false;
        (async () => {
            setRegionLoading(true);
            setRegionError('');
            try {
                const data = await getRegionsRef.current();
                if (!aborted) setRegions(Array.isArray(data) ? data : []);
            } catch (e: any) {
                if (!aborted) setRegionError(e?.message ?? '지역 정보를 불러오지 못했습니다.');
            } finally {
                if (!aborted) setRegionLoading(false);
            }
        })();
        return () => { aborted = true; };
    }, []);

    const cities = useMemo(() => regions.filter(r => r.parentId === null), [regions]);
    const districts = useMemo(() => {
        if (!selectedCityId) return [];
        const city = regions.find(r => r.id === selectedCityId);
        if (city?.children?.length) return city.children;
        return regions.filter(r => r.parentId === selectedCityId);
    }, [regions, selectedCityId]);

    // 트리 평탄화 유틸
    const flattenRegions = (list: RegionItem[]): RegionItem[] => {
        if (!list?.length) return [];
        if (!list.some(n => Array.isArray(n.children) && n.children.length)) return list;
        const flat: RegionItem[] = [];
        const stack = [...list];
        while (stack.length) {
            const n = stack.pop()!;
            flat.push({ id: n.id, name: n.name, parentId: n.parentId });
            if (n.children?.length) stack.push(...n.children);
        }
        return flat;
    };

    const emitFilters = (next: Partial<Filters> = {}) => {
        if (!onFiltersChange) return;

        const city = cities.find(c => c.id === selectedCityId);
        const district = districts.find(d => d.id === selectedDistrictId);

        const regionLabel =
            city && district ? `${city.name} ${district.name}` :
            district ? district.name :
            city ? city.name : undefined;

        const filters: Filters = {
            region: selectedDistrictId || selectedCityId || undefined,
            regionLabel,
            categoryId: selectedCategoryId || undefined,
            minPrice: parsedMin,
            maxPrice: parsedMax,
            shareOnly,
            myOnly,
            status: onSaleOnly ? 'ON_SALE' : undefined,
            ...next,
        };

        onFiltersChange(filters);
        onRegionTextChange?.(filters.regionLabel ?? '');
    };

    const scrollTop = () => {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
        catch { window.scrollTo(0, 0); }
    };

    /** ✅ 최초 1회 지역 초기화: 저장값 > (없으면) 프로필 기본지역 */
    const initRegionOnceRef = useRef(false);
    useEffect(() => {
        if (initRegionOnceRef.current) return;
        if (regionLoading || !regions.length) return;
        initRegionOnceRef.current = true;

        // 1) 저장값 우선 복원
        let stored: { cityId?: string; districtId?: string; label?: string } | null = null;
        try {
            const raw = localStorage.getItem(REGION_STORE_KEY);
            if (raw) stored = JSON.parse(raw);
        } catch {}

        const flat = flattenRegions(regions);

        if (stored && (stored.cityId || stored.districtId)) {
            const cityId = stored.cityId || '';
            const districtId = stored.districtId || '';
            setSelectedCityId(cityId);
            setSelectedDistrictId(districtId);

            const cityName = cityId ? (flat.find(n => n.id === cityId)?.name ?? '') : '';
            const distName = districtId ? (flat.find(n => n.id === districtId)?.name ?? '') : '';
            const label =
                (stored.label && stored.label.trim().length)
                    ? stored.label
                    : (cityName && distName ? `${cityName} ${distName}` : (distName || cityName || ''));

            emitFilters({ region: districtId || cityId || undefined, regionLabel: label || undefined });
            onRegionTextChange?.(label || '');
            return; // 저장값 적용했으면 끝
        }

        // 2) 저장값 없으면 프로필 기본지역 사용(로그인 시)
        if (isAuthenticated) {
            (async () => {
                try {
                    const res = await authFetch(`${API_BASE}/api/users/me`, { method: 'GET' }, { requireAuth: true });
                    if (!res.ok) return;
                    const me = await res.json();
                    const regionId: string | undefined = me?.region?.id ?? me?.region_id ?? undefined;
                    if (!regionId) return;

                    const node = flat.find(n => n.id === regionId);
                    if (!node) return;

                    if (node.parentId) {
                        const parent = flat.find(n => n.id === node.parentId);
                        if (parent) {
                            setSelectedCityId(parent.id);
                            setSelectedDistrictId(node.id);
                            const label = `${parent.name} ${node.name}`;
                            emitFilters({ region: node.id, regionLabel: label });
                            onRegionTextChange?.(label);
                            try { localStorage.setItem(REGION_STORE_KEY, JSON.stringify({ cityId: parent.id, districtId: node.id, label })); } catch {}
                        }
                    } else {
                        setSelectedCityId(node.id);
                        setSelectedDistrictId('');
                        const label = node.name;
                        emitFilters({ region: node.id, regionLabel: label });
                        onRegionTextChange?.(label);
                        try { localStorage.setItem(REGION_STORE_KEY, JSON.stringify({ cityId: node.id, districtId: '', label })); } catch {}
                    }
                } catch {
                    /* ignore */
                }
            })();
        }
    }, [regionLoading, regions, isAuthenticated, authFetch, onRegionTextChange]);

    // ✅ URL 쿼리(myOnly=1)로 들어왔을 때 자동으로 "내 판매 상품만 보기" 켜기 (한 번만)
    const appliedMyOnlyFromQueryRef = useRef(false);
    useEffect(() => {
        if (appliedMyOnlyFromQueryRef.current) return;
        const sp = new URLSearchParams(location.search);
        const myOnlyParam = sp.get('myOnly');
        const shouldMyOnly = myOnlyParam === '1' || myOnlyParam === 'true';

        if (shouldMyOnly && isLoggedIn) {
            appliedMyOnlyFromQueryRef.current = true;
            // 카테고리 초기화 + myOnly 켜기
            setSelectedCategoryId('');
            onCategorySelect('');
            onCategoryLabelChange?.('');
            setMyOnly(true);
            emitFilters({ myOnly: true, categoryId: undefined });
            scrollTop();
        }
    }, [location.search, isLoggedIn, onCategorySelect, onCategoryLabelChange]);

    // 지역 선택
    const handleCitySelect = (id: string) => {
        setSelectedCityId(id);
        setSelectedDistrictId('');

        const cityName = cities.find(c => c.id === id)?.name || undefined;

        emitFilters({
            region: id || undefined,
            regionLabel: cityName,
        });
        onRegionTextChange?.(cityName ?? '');
        // ✅ 저장
        try { localStorage.setItem(REGION_STORE_KEY, JSON.stringify({ cityId: id || '', districtId: '', label: cityName ?? '' })); } catch {}
        scrollTop();
    };

    const handleDistrictSelect = (id: string) => {
        setSelectedDistrictId(id);

        const cityName = cities.find(c => c.id === selectedCityId)?.name || '';
        const distName = districts.find(d => d.id === id)?.name || '';
        const label = (cityName && distName) ? `${cityName} ${distName}` : (distName || cityName || '');

        emitFilters({
            region: id || selectedCityId || undefined,
            regionLabel: label || undefined,
        });
        onRegionTextChange?.(label);
        // ✅ 저장
        try { localStorage.setItem(REGION_STORE_KEY, JSON.stringify({ cityId: selectedCityId || '', districtId: id || '', label })); } catch {}
        scrollTop();
    };

    // 카테고리
    const handleCategoryClick = (id: string) => {
        if (selectedCategoryId === id) {
            setSelectedCategoryId('');
            onCategorySelect('');
            onCategoryLabelChange?.('');
            emitFilters({ categoryId: undefined });
            return scrollTop();
        }
        const label = categories.find((c) => c.id === id)?.name ?? '';
        if (myOnly) {
            setMyOnly(false);
            setSelectedCategoryId(id);
            onCategorySelect(id);
            onCategoryLabelChange?.(label);
            emitFilters({ myOnly: false, categoryId: id });
            return scrollTop();
        }
        setSelectedCategoryId(id);
        onCategorySelect(id);
        onCategoryLabelChange?.(label);
        emitFilters({ categoryId: id });
        scrollTop();
    };

    // 내 판매상품
    const handleMyOnlyToggle = () => {
        const next = !myOnly;
        setMyOnly(next);
        if (next) {
            setSelectedCategoryId('');
            onCategorySelect('');
            onCategoryLabelChange?.('');
            emitFilters({ myOnly: true, categoryId: undefined });
        } else {
            emitFilters({ myOnly: false });
        }
        scrollTop();
    };

    // 판매중만
    const handleOnSaleOnlyToggle = () => {
        const next = !onSaleOnly;
        setOnSaleOnly(next);
        emitFilters({ status: next ? 'ON_SALE' : undefined });
        scrollTop();
    };

    // 가격
    const applyPriceForm = (e?: React.FormEvent) => {
        e?.preventDefault();
        setActivePreset(null);
        setShareOnly(false);
        emitFilters({ shareOnly: false, minPrice: parsedMin, maxPrice: parsedMax });
        scrollTop();
    };

    const handlePresetClick = (type: 'SHARE' | '5000' | '10000' | '20000') => {
        if (activePreset === type) {
            setActivePreset(null);
            setShareOnly(false);
            emitFilters({ shareOnly: false, minPrice: parsedMin, maxPrice: parsedMax });
            return scrollTop();
        }
        setActivePreset(type);
        if (type === 'SHARE') {
            setShareOnly(true);
            emitFilters({ shareOnly: true, minPrice: undefined, maxPrice: undefined });
            return scrollTop();
        }
        setShareOnly(false);
        const limit = type === '5000' ? 5000 : type === '10000' ? 10000 : 20000;
        emitFilters({ shareOnly: false, minPrice: undefined, maxPrice: limit });
        scrollTop();
    };

    const handleReset = () => {
        setSelectedCategoryId('');
        setSelectedCityId('');
        setSelectedDistrictId('');
        setMinPrice('');
        setMaxPrice('');
        setShareOnly(false);
        setActivePreset(null);
        setMyOnly(false);
        setOnSaleOnly(false);

        onCategorySelect('');
        onCategoryLabelChange?.('');
        onRegionTextChange?.('');
        emitFilters({
            region: undefined,
            regionLabel: undefined,
            categoryId: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            shareOnly: false,
            myOnly: false,
            status: undefined,
        });

        // ✅ 저장값도 초기화 버튼에서만 제거
        try { localStorage.removeItem(REGION_STORE_KEY); } catch {}
        scrollTop();
    };

    return (
        <div className="category-wrapper">
            {/* 지역 선택 */}
            <div className="region-row">
                <label className="region-label">지역</label>
                <div className="region-dual">
                    <CategoryDropdown
                        className="region-select"
                        items={[{ id: '', name: '전체' }, ...cities]}
                        value={selectedCityId}
                        onChange={handleCitySelect}
                        disabled={regionLoading}
                        loading={regionLoading}
                        placeholder="시/도 선택"
                        ariaLabel="시/도 선택"
                    />
                    <CategoryDropdown
                        className="region-select"
                        items={selectedCityId ? [{ id: '', name: '전체' }, ...districts] : []}
                        value={selectedDistrictId}
                        onChange={handleDistrictSelect}
                        disabled={regionLoading || !selectedCityId}
                        loading={regionLoading}
                        placeholder={selectedCityId ? '구 선택' : '시/도를 먼저 선택'}
                        ariaLabel="구 선택"
                    />
                </div>
            </div>
            {regionError && <p className="error-text" style={{ marginTop: 6 }}>{regionError}</p>}

            {/* 내 판매 상품 */}
            {isLoggedIn && (
                <div className="myonly-row">
                    <button
                        type="button"
                        className={`myonly-chip ${myOnly ? 'active' : ''}`}
                        onClick={handleMyOnlyToggle}
                        aria-pressed={myOnly}
                    >
                        내 판매 상품만 보기
                    </button>
                </div>
            )}

            {/* 판매중만 */}
            <div className="onsale-row">
                <button
                    type="button"
                    className={`onsale-chip ${onSaleOnly ? 'active' : ''}`}
                    onClick={handleOnSaleOnlyToggle}
                    aria-pressed={onSaleOnly}
                >
                    판매중인 상품만 보기
                </button>
            </div>

            {/* 카테고리 */}
            <h3 className="category-title">카테고리</h3>
            {loadingCategories && <p className="hint-text">카테고리를 불러오는 중...</p>}
            {categoriesError && <p className="error-text" style={{ marginTop: 6 }}>{categoriesError}</p>}
            <div className="category-bar">
                {!loadingCategories && categories.map((cat) => (
                    <button
                        key={cat.id}
                        className={`category-button ${selectedCategoryId === cat.id ? 'selected' : ''}`}
                        onClick={() => handleCategoryClick(cat.id)}
                        type="button"
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* 가격 */}
            <div className="price-filter">
                <h4 className="price-title">가격</h4>

                <div className="price-presets">
                    <button
                        type="button"
                        className={`preset-chip ${activePreset === 'SHARE' ? 'active' : ''}`}
                        onClick={() => handlePresetClick('SHARE')}
                    >
                        나눔
                    </button>
                    <button
                        type="button"
                        className={`preset-chip ${activePreset === '5000' ? 'active' : ''}`}
                        onClick={() => handlePresetClick('5000')}
                    >
                        5,000원 이하
                    </button>
                    <button
                        type="button"
                        className={`preset-chip ${activePreset === '10000' ? 'active' : ''}`}
                        onClick={() => handlePresetClick('10000')}
                    >
                        1만원 이하
                    </button>
                    <button
                        type="button"
                        className={`preset-chip ${activePreset === '20000' ? 'active' : ''}`}
                        onClick={() => handlePresetClick('20000')}
                    >
                        2만원 이하
                    </button>
                </div>

                <form className="price-form" onSubmit={applyPriceForm}>
                    <div className="price-inputs">
                        <label className="price-label">
                            최소
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))}
                            />
                        </label>
                        <label className="price-label">
                            최대
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="예: 100000"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))}
                            />
                        </label>
                    </div>
                    <div className="price-actions">
                        <button type="submit" className="apply-btn">적용</button>
                        <button type="button" className="reset-btn" onClick={handleReset}>초기화</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductFilters;
