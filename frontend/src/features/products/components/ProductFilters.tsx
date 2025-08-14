import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ProductFilters.css';
import CategoryDropdown from '../routes/CategoryDropdown';
import useAuth, { RegionItem } from '../../auth/hooks/useAuth';
import { useCategories } from '../hooks/useProducts';

export type Filters = {
    /** ✅ 서버 전송용: 지역 id (구/시 또는 시/도) */
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
};

const ProductFilters: React.FC<Props> = ({ onCategorySelect, onFiltersChange, onCategoryLabelChange }) => {
    const { categories, loadingCategories, categoriesError } = useCategories();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

    const { getRegions } = useAuth();
    const [regions, setRegions] = useState<RegionItem[]>([]);
    const [regionLoading, setRegionLoading] = useState(false);
    const [regionError, setRegionError] = useState('');
    const [selectedCityId, setSelectedCityId] = useState('');       // 시/도 id
    const [selectedDistrictId, setSelectedDistrictId] = useState(''); // 구/시 id

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

    const emitFilters = (next: Partial<Filters> = {}) => {
        if (!onFiltersChange) return;

        const city = cities.find(c => c.id === selectedCityId);
        const district = districts.find(d => d.id === selectedDistrictId);

        const filters: Filters = {
            region: selectedDistrictId || selectedCityId || undefined,          // ✅ 서버로 보낼 id
            regionLabel: district?.name || city?.name || undefined,            // 표시용
            categoryId: selectedCategoryId || undefined,
            minPrice: parsedMin,
            maxPrice: parsedMax,
            shareOnly,
            myOnly,
            status: onSaleOnly ? 'ON_SALE' : undefined,
            ...next,
        };

        // 디버그
        console.log('[ProductFilters emitFilters]', filters);
        onFiltersChange(filters);
    };

    const scrollTop = () => {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
        catch { window.scrollTo(0, 0); }
    };

    // 지역 선택
    const handleCitySelect = (id: string) => {
        setSelectedCityId(id);
        setSelectedDistrictId('');
        emitFilters({
            region: id || undefined,
            regionLabel: cities.find(c => c.id === id)?.name || undefined,
        });
        scrollTop();
    };

    const handleDistrictSelect = (id: string) => {
        setSelectedDistrictId(id);
        emitFilters({
            region: id || selectedCityId || undefined,
            regionLabel: districts.find(d => d.id === id)?.name
                || cities.find(c => c.id === selectedCityId)?.name
                || undefined,
        });
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
                    <button type="button" className={`preset-chip ${activePreset === 'SHARE' ? 'active' : ''}`} onClick={() => handlePresetClick('SHARE')}>나눔</button>
                    <button type="button" className={`preset-chip ${activePreset === '5000' ? 'active' : ''}`} onClick={() => handlePresetClick('5000')}>5,000원 이하</button>
                    <button type="button" className={`preset-chip ${activePreset === '10000' ? 'active' : ''}`} onClick={() => handlePresetClick('10000')}>1만원 이하</button>
                    <button type="button" className={`preset-chip ${activePreset === '20000' ? 'active' : ''}`} onClick={() => handlePresetClick('20000')}>2만원 이하</button>
                </div>

                <form className="price-form" onSubmit={applyPriceForm}>
                    <div className="price-inputs">
                        <label className="price-label">
                            최소
                            <input type="text" inputMode="numeric" placeholder="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))} />
                        </label>
                        <label className="price-label">
                            최대
                            <input type="text" inputMode="numeric" placeholder="예: 100000" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))} />
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
