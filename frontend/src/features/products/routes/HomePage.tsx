// features/products/routes/HomePage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../components/HomePage.css';
import ProductFilters from '../components/ProductFilters';
import ProductSearch from '../components/ProductSearch';
import useProducts, { Product, Filters } from '../hooks/useProducts';

const HomePage: React.FC = () => {
    const [animate, setAnimate] = useState(false);
    const hasAnimated = useRef(false);

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

    const titleText = (() => {
        if (filters.myOnly) {
            if (categoryLabel) return `내 판매 상품 · ${categoryLabel}`;
            return `내 판매 상품`;
        }
        if (categoryLabel) return `${categoryLabel}`;
        return `전체 상품`;
    })();

    const formatRelativeTime = (isoDate?: string) => {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
        const now = new Date();
        const diffMs = now.getTime() - kstDate.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        if (diffMin < 1) return '방금 전';
        if (diffMin < 60) return `${diffMin}분 전`;
        if (diffHour < 24) return `${diffHour}시간 전`;
        return `${diffDay}일 전`;
    };

    const getDisplayTime = (updatedAt?: string, createdAt?: string) => {
        const baseTime = updatedAt || createdAt;
        return formatRelativeTime(baseTime);
    };

    const renderStatusBadge = (status: string) => {
        if (status === 'RESERVED') return <div className="status-badge reserved">예약중</div>;
        if (status === 'SOLD') return <div className="status-badge sold">판매완료</div>;
        return null;
    };

    const PAGE_SIZE = 30;
    const showLoadMore = hasMore && products.length >= PAGE_SIZE;

    // 👇 스크롤 위치에 따라 카드에 미세한 translateY 적용 (부드러운 플로팅)
    useEffect(() => {
        let ticking = false;

        const updateCardTransforms = () => {
            const center = window.innerHeight / 2;
            const cards = document.querySelectorAll<HTMLElement>('.item-card');
            cards.forEach((card) => {
                const rect = card.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const distance = mid - center; // 화면 중앙으로부터의 거리(+아래, -위)
                // 거리 비례로 shift 적용(최대 24px 제한)
                const shift = Math.max(-24, Math.min(24, -distance * 0.08));
                card.style.setProperty('--scroll-shift', `${shift.toFixed(1)}px`);

                // 화면에 들어오면 in-view 클래스(투명도/페이드 제어)
                const inView = rect.top < window.innerHeight - 40 && rect.bottom > 40;
                if (inView) card.classList.add('in-view');
                else card.classList.remove('in-view');
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
        // 최초 1회 계산
        updateCardTransforms();

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
        // 목록 변경 시 다시 계산
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
                                    {products.map((item: Product) => (
                                        <Link to={`/item/${item.id}`} key={item.id} className="item-card fade-in-up">
                                            <div className="image-wrapper">
                                                {renderStatusBadge(item.status)}
                                                <img
                                                    src={item.imageUrl || '/images/default.jpg'}
                                                    alt={item.name}
                                                    className="product-image"
                                                />
                                            </div>
                                            <div className="item-info">
                                                <h3 className="truncate-text">{item.name}</h3>
                                                <p className="price-info">
                                                    {item.tradeType === 'SHARE'
                                                        ? '나눔'
                                                        : `${item.price.toLocaleString()}원`}
                                                </p>
                                                <p className="extra-info">
                                                    👁 {item.viewCount ?? 0}회 | {getDisplayTime(item.updatedAt, item.createdAt)}
                                                </p>
                                            </div>
                                        </Link>
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

                                {/* ✅ 더 이상 불러올 데이터가 없으면 안내 문구 표시 */}
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
