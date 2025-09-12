// features/products/components/ProductFilters.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './ProductFilters.css';
import useAuth from '../../auth/hooks/useAuth';
import { useCategories } from '../hooks/useProducts';
import RegionFilter, { RegionChange } from './RegionFilter';

export type Filters = {
    /** 서버 전송용: 지역 id (구/시 또는 시/도) */
    regionId?: string;
    /** 호환용: useProducts 등에서 region 키를 기대할 수 있어 같이 전달 */
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
    const { isAuthenticated } = useAuth() as { isAuthenticated: boolean };

    const { categories, loadingCategories, categoriesError } = useCategories();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

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

    const scrollTop = () => {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
        catch { window.scrollTo(0, 0); }
    };

    // ----- Region change bridge -----
    const handleRegionChange = (r: RegionChange) => {
        if (!onFiltersChange) return;
        onFiltersChange({
            region: r.region,
            regionLabel: r.regionLabel,
            categoryId: selectedCategoryId || undefined,
            minPrice: parsedMin,
            maxPrice: parsedMax,
            shareOnly,
            myOnly,
            status: onSaleOnly ? 'ON_SALE' : undefined,
        });
        onRegionTextChange?.(r.regionLabel ?? '');
    };

    // ----- URL ?myOnly=1 적용 -----
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
            onFiltersChange?.({ myOnly: true, categoryId: undefined });
            scrollTop();
        }
    }, [location.search, isLoggedIn, onCategorySelect, onCategoryLabelChange, onFiltersChange]);

    // ----- helpers -----
    const emitFilters = (next: Partial<Filters> = {}) => {
        if (!onFiltersChange) return;
        onFiltersChange({
            categoryId: selectedCategoryId || undefined,
            minPrice: parsedMin,
            maxPrice: parsedMax,
            shareOnly,
            myOnly,
            status: onSaleOnly ? 'ON_SALE' : undefined,
            ...next,
        });
    };

    // ----- Categories -----
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

    // ----- My Only -----
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

    // ----- On Sale Only -----
    const handleOnSaleOnlyToggle = () => {
        const next = !onSaleOnly;
        setOnSaleOnly(next);
        emitFilters({ status: next ? 'ON_SALE' : undefined });
        scrollTop();
    };

    // ----- Price -----
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
        setMinPrice('');
        setMaxPrice('');
        setShareOnly(false);
        setActivePreset(null);
        setMyOnly(false);
        setOnSaleOnly(false);

        onCategorySelect('');
        onCategoryLabelChange?.('');
        onRegionTextChange?.('');
        onFiltersChange?.({
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
            {/* 카테고리 */}
            <h3 className="category-title">카테고리</h3>
            {loadingCategories && <p className="hint-text">카테고리를 불러오는 중...</p>}
            {categoriesError && <p className="error-text" style={{ marginTop: 6 }}>{categoriesError}</p>}
            <div className="category-bar">
                {/* ✅ 맨 앞에 "전체" 버튼 추가 */}
                {!loadingCategories && (
                    <button
                        className={`category-button ${selectedCategoryId === '' ? 'selected' : ''}`}
                        onClick={() => {
                            setSelectedCategoryId('');
                            onCategorySelect('');
                            onCategoryLabelChange?.('');
                            emitFilters({ categoryId: undefined });
                            scrollTop();
                        }}
                        type="button"
                    >
                        전체
                    </button>
                )}

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
