// pages/HomePage.tsx
import React, { useEffect, useRef, useState } from 'react';
import '../components/HomePage.css';
import ProductFilters from '../components/ProductFilters';
import ProductSearch from '../components/ProductSearch';
import useProducts, { Product, Filters } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import RegionFilter, { RegionChange } from '../components/RegionFilter';

const HomePage: React.FC = () => {
    const [animate, setAnimate] = useState(false);
    const hasAnimated = useRef(false);

    // 상단 검색 타이틀에 보여줄 지역 라벨 (예: "서울 강남구" 또는 "서울")
    const [regionText, setRegionText] = useState<string>('');

    // 탭/토글 (UI 전용)
    const [rightModeShare, setRightModeShare] = useState<boolean>(false); // false=판매, true=나눔
    const [deliveryType, setDeliveryType] = useState<'DIRECT' | 'PARCEL' | null>(null);

    const {
        products,
        loading,
        loadingMore,
        hasMore,
        error,
        filters,
        setFilters,
        setSearchKeyword,
        loadMore,
        refresh,
    } = useProducts();

    const [categoryLabel, setCategoryLabel] = useState<string>('');

    useEffect(() => {
        if (!hasAnimated.current) {
            hasAnimated.current = true;
            setAnimate(true);
        }
    }, []);

    const handleSearch = (keyword: string) => setSearchKeyword(keyword);

    // RegionFilter → useProducts 필터 반영 + regionText 반영
    const handleRegionChange = (r: RegionChange) => {
        setFilters((prev) => ({
            ...prev,
            region: r.region,
            regionLabel: r.regionLabel,
        } as Partial<Filters>));
        setRegionText(r.regionLabel ?? '');
    };

    const handleRightModeChange = (mode: 'SALE' | 'SHARE') => {
        const nextShare = mode === 'SHARE';
        setRightModeShare(nextShare);
        setFilters((prev) => ({
            ...prev,
            shareOnly: nextShare,
            minPrice: nextShare ? undefined : prev.minPrice,
            maxPrice: nextShare ? undefined : prev.maxPrice,
        } as Partial<Filters>));
    };

    const handleDeliveryTypeChange = (t: 'DIRECT' | 'PARCEL' | null) => {
        setDeliveryType(t);
        // 서버 필터를 붙일 경우:
        // setFilters((prev) => ({ ...prev, deliveryType: t } as any));
    };

    const PAGE_SIZE = 20;
    const showLoadMore = hasMore && products.length >= PAGE_SIZE;

    // 스크롤 효과(생략 가능)
    const lastTopMapRef = useRef<WeakMap<HTMLElement, number>>(new WeakMap());
    useEffect(() => {
        let ticking = false;

        const updateCardTransforms = () => {
            const center = window.innerHeight / 2;
            const cards = document.querySelectorAll<HTMLElement>('.item-card');
            cards.forEach((card) => {
                const rect = card.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const distance = mid - center;
                const shift = Math.max(-24, Math.min(24, -distance * 0.08));
                card.style.setProperty('--scroll-shift', `${shift.toFixed(1)}px`);
                lastTopMapRef.current.set(card, rect.top);
            });
        };

        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                updateCardTransforms();
                ticking = false;
            });
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        updateCardTransforms();

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [products.length]);

    useEffect(() => {
        const cards = document.querySelectorAll<HTMLElement>('.item-card.fade-in-up');

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const el = entry.target as HTMLElement;
                    if (!entry.isIntersecting) return;
                    if (el.dataset.seen === '1') return;

                    const nowTop = entry.boundingClientRect.top;
                    const prevTop = lastTopMapRef.current.get(el);
                    const isScrollingDown = prevTop == null ? true : nowTop < prevTop;

                    if (isScrollingDown) {
                        el.classList.remove('seen-no-anim');
                        el.classList.add('in-view');
                    } else {
                        el.classList.remove('in-view');
                        el.classList.add('seen-no-anim');
                    }

                    el.dataset.seen = '1';
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );

        cards.forEach((c) => {
            c.classList.remove('in-view', 'seen-no-anim');
            io.observe(c);
        });

        return () => io.disconnect();
    }, [products.length]);

    return (
        <div className={`main-container ${animate ? 'fade-in' : ''}`}>
            <div className="main-homepage">
                {/* ✅ 선택한 지역 라벨을 그대로 전달 */}
                <ProductSearch
                    onSearch={handleSearch}
                    userRegionName={regionText}   // ← "서울 강남구" 또는 "서울"
                />

                <div className="content-layout">
                    <div className="sidebar">
                        <ProductFilters
                            onCategorySelect={(id) => {
                                setFilters((prev) => ({
                                    ...prev,
                                    categoryId: id || undefined,
                                }));
                            }}
                            onFiltersChange={(ff) => {
                                setFilters(ff as Partial<Filters>);
                            }}
                            onCategoryLabelChange={(label) => setCategoryLabel(label)}
                            onRegionTextChange={setRegionText}
                        />
                    </div>

                    <div className="main-content">
                        {/* 상단 툴바 */}
                        <RegionFilter
                            onChange={handleRegionChange}
                            onRegionTextChange={setRegionText}
                            rightMode={rightModeShare ? 'SHARE' : 'SALE'}
                            onRightModeChange={handleRightModeChange}
                            deliveryType={deliveryType}
                            onDeliveryTypeChange={handleDeliveryTypeChange}
                            sortKey={(filters as any).sortKey ?? 'latest'}
                            onSortChange={(s) =>
                                setFilters((prev) => ({ ...prev, sortKey: s } as Partial<Filters>))
                            }
                            onRefresh={refresh}
                        />

                        {loading && products.length === 0 ? (
                            <p className="loading-text">로딩 중...</p>
                        ) : error ? (
                            <p className="error-text">{error}</p>
                        ) : products.length === 0 ? (
                            <p className="empty-text">조건에 맞는 상품이 없어요.</p>
                        ) : (
                            <>
                                <div className="main-items">
                                    {products.map((item: Product, i: number) => (
                                        <ProductCard
                                            key={item.id}
                                            product={item}
                                            to={`/item/${item.id}`}
                                            index={i}
                                            showRegion
                                            showTime
                                            showCounts
                                        />
                                    ))}
                                </div>

                                {showLoadMore && (
                                    <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 32px' }}>
                                        <button
                                            className="load-more-btn"
                                            onClick={loadMore}
                                            disabled={loadingMore}
                                        >
                                            {loadingMore ? '불러오는 중...' : '더 보기'}
                                        </button>
                                    </div>
                                )}

                                {!hasMore && products.length > 0 && (
                                    <div
                                        className="end-of-list"
                                        style={{ textAlign: 'center', color: '#8b8b8b', margin: '16px 0 32px' }}
                                        role="status"
                                        aria-live="polite"
                                    >
                                        상품의 끝에 도달했습니다 🎉
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
