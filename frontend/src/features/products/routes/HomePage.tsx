import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../components/HomePage.css';
import ProductFilters from '../components/ProductFilters';
import ProductSearch from '../components/ProductSearch';
import useProducts, { Product, Filters } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';

const HomePage: React.FC = () => {
    const [animate, setAnimate] = useState(false);
    const hasAnimated = useRef(false);
    const [regionText, setRegionText] = useState<string>('');

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
    } = useProducts();

    const [categoryLabel, setCategoryLabel] = useState<string>('');

    useEffect(() => {
        if (!hasAnimated.current) {
            hasAnimated.current = true;
            setAnimate(true);
        }
    }, []);

    const handleSearch = (keyword: string) => setSearchKeyword(keyword);

    const titleText = React.useMemo(() => {
        const base = (() => {
            if (filters.myOnly) {
                return categoryLabel ? `내 판매 상품 · ${categoryLabel}` : '내 판매 상품';
            }
            return categoryLabel || '전체 상품';
        })();

        // myOnly일 때는 지역(prefix) 제거
        if (filters.myOnly) return base;

        const prefix = regionText.trim();
        return prefix ? `${prefix} · ${base}` : base;
    }, [filters.myOnly, categoryLabel, regionText]);

    const PAGE_SIZE = 20;
    const showLoadMore = hasMore && products.length >= PAGE_SIZE;

    // 각 카드의 '직전 top' 값을 저장할 WeakMap (요소별 방향 판별용)
    const lastTopMapRef = useRef<WeakMap<HTMLElement, number>>(new WeakMap());

    // 스크롤에 따른 부드러운 플로팅(shift) + 요소별 prevTop 기록
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

                // 이 프레임에서의 top을 저장 (교차 시점에 nowTop과 비교)
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

    // 교차 시 요소별 방향 판별
    useEffect(() => {
        const cards = document.querySelectorAll<HTMLElement>('.item-card.fade-in-up');

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const el = entry.target as HTMLElement;
                    if (!entry.isIntersecting) return;

                    // 이미 1회 처리된 요소는 건너뜀
                    if (el.dataset.seen === '1') return;

                    const nowTop = entry.boundingClientRect.top;
                    const prevTop = lastTopMapRef.current.get(el);

                    // prevTop이 아직 없으면 '아래 스크롤'로 간주해 자연스럽게 애니메이션
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

        // 새로 렌더된 카드들 관찰 시작 (기존 클래스는 정리)
        cards.forEach((c) => {
            c.classList.remove('in-view', 'seen-no-anim');
            io.observe(c);
        });

        return () => io.disconnect();
    }, [products.length]);

    return (
        <div className={`main-container ${animate ? 'fade-in' : ''}`}>
            <div className="main-homepage">
                <ProductSearch onSearch={handleSearch} />

                <div className="content-layout">
                    <div className="sidebar">
                        <h3 className="filter-title">필터</h3>
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
                        <h2 className="result-title">{titleText}</h2>
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
