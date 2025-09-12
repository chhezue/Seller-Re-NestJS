// MySalesPage.tsx
import React from 'react';
import { useMySales } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';

type StatusFilter = 'ALL' | 'ON_SALE' | 'RESERVED' | 'SOLD';

const MySalesPage: React.FC = () => {
    const { products, loading, loadingMore, hasMore, error, loadMore } = useMySales();

    const isLoggedIn = React.useMemo(() => !!localStorage.getItem('accessToken'), []);
    const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL');

    // 상태별 카운트 (뱃지용)
    const counts = React.useMemo(() => {
        const base = { ALL: products.length, ON_SALE: 0, RESERVED: 0, SOLD: 0 };
        for (const p of products) {
            if (p.status === 'ON_SALE') base.ON_SALE++;
            else if (p.status === 'RESERVED') base.RESERVED++;
            else if (p.status === 'SOLD') base.SOLD++;
        }
        return base;
    }, [products]);

    const filteredProducts = React.useMemo(() => {
        if (statusFilter === 'ALL') return products;
        return products.filter(p => p.status === statusFilter);
    }, [products, statusFilter]);

    if (!isLoggedIn) {
        return (
            <div className="container" style={{ maxWidth: 980, margin: '24px auto', padding: '0 16px' }}>
                <h2 style={{ marginBottom: 16 }}>내 판매 목록</h2>
                <p>로그인이 필요합니다. 로그인 후 내 판매 목록을 확인하세요.</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: 980, margin: '24px auto', padding: '0 16px' }}>
            <h2 style={{ marginBottom: 16 }}>내 판매 목록</h2>

            {/* 상태 필터 버튼 */}
            <div
                role="tablist"
                aria-label="판매 상태 필터"
                style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}
            >
                {([
                    { key: 'ALL', label: `전체 (${counts.ALL})` },
                    { key: 'ON_SALE', label: `판매중 (${counts.ON_SALE})` },
                    { key: 'RESERVED', label: `예약중 (${counts.RESERVED})` },
                    { key: 'SOLD', label: `판매완료 (${counts.SOLD})` },
                ] as { key: StatusFilter; label: string }[]).map(btn => {
                    const active = statusFilter === btn.key;
                    return (
                        <button
                            key={btn.key}
                            role="tab"
                            aria-selected={active}
                            className={`chip ${active ? 'active' : ''}`}
                            onClick={() => setStatusFilter(btn.key)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 999,
                                border: `1px solid ${active ? '#6c5ce7' : 'rgba(0,0,0,0.12)'}`,
                                background: active ? '#f2f2ff' : '#fff',
                                color: active ? '#6c5ce7' : '#333',
                                cursor: 'pointer',
                                fontSize: 14,
                            }}
                        >
                            {btn.label}
                        </button>
                    );
                })}
            </div>

            {error && <p style={{ color: '#b00020' }}>{error}</p>}

            {loading && products.length === 0 ? (
                <p>불러오는 중…</p>
            ) : filteredProducts.length === 0 ? (
                <p>해당 상태의 판매 상품이 없습니다.</p>
            ) : (
                <div
                    className="grid"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}
                >
                    {filteredProducts.map((p, i) => (
                        <ProductCard key={p.id} product={p} to={`/item/${p.id}`} index={i} />
                    ))}
                </div>
            )}

            {hasMore && (
                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                    <button onClick={loadMore} disabled={loadingMore} className="btn">
                        {loadingMore ? '불러오는 중…' : '더 보기'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MySalesPage;
