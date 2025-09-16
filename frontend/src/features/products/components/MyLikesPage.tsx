import React from 'react';
import { useMyLikes } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';

const MyLikesPage: React.FC = () => {
    const {
        items,
        loading,
        loadingMore,
        error,
        hasMore,
        loadMore,
    } = useMyLikes();

    return (
        <div className="container" style={{ maxWidth: 980, margin: '24px auto', padding: '0 16px' }}>
            <h2 style={{ marginBottom: 16 }}>찜한 상품</h2>

            {error && <p style={{ color: '#b00020' }}>{error}</p>}

            {loading && items.length === 0 ? (
                <p>불러오는 중…</p>
            ) : items.length === 0 ? (
                <p>찜한 상품이 없습니다.</p>
            ) : (
                <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    {items.map((p, i) => (
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

export default MyLikesPage;
