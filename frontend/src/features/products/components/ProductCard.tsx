import React from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../hooks/useProducts';

type Props = {
    product: Product;
    to?: string;                         // 넘겨주면 <Link>로 감쌈
    index?: number;                      // 스태거 애니메이션 딜레이
    className?: string;
    showRegion?: boolean;
    showTime?: boolean;
    showCounts?: boolean;                // 👁 조회수 / ♡ 찜수
};

const formatRelativeTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const diff = Date.now() - kst.getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const day = Math.floor(h / 24);
    if (m < 1) return '방금 전';
    if (m < 60) return `${m}분 전`;
    if (h < 24) return `${h}시간 전`;
    return `${day}일 전`;
};

const renderStatusBadge = (status: string) => {
    if (status === 'RESERVED') return <div className="status-badge reserved">예약중</div>;
    if (status === 'SOLD') return <div className="status-badge sold">판매완료</div>;
    return null;
};

const ProductCard: React.FC<Props> = ({
    product,
    to,
    index = 0,
    className = '',
    showRegion = true,
    showTime = true,
    showCounts = true,
}) => {
    const regionLabel = product.region?.name || '';
    const timeText = formatRelativeTime(product.updatedAt || product.createdAt);

    const CardInner = (
        <div
            className={`item-card fade-in ${className}`}
            style={{ ['--delay' as any]: `${(index % 12) * 40}ms` }}
        >
            <div className="image-wrapper">
                {renderStatusBadge(product.status)}
                <img
                    src={product.imageUrl || '/images/default.jpg'}
                    alt={product.name}
                    className="product-image"
                />
            </div>

            <div className="item-info">
                <h3 className="truncate-text">{product.name}</h3>

                <p className="price-info">
                    {product.tradeType === 'SHARE' ? '나눔' : `${product.price.toLocaleString()}원`}
                </p>

                {/* 메타 영역: 좌측 지역(옵션) + 시간(옵션) / 우측 조회·찜(옵션) */}
                <div
                    className="item-meta-row"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                    }}
                >
                    <span className="region-chip">
                        {showRegion && (regionLabel || '지역 미지정')}
                        {showRegion && showTime && ' · '}
                        {showTime && timeText}
                    </span>

                    {showCounts && (
                        <p className="extra-info" style={{ margin: 0, textAlign: 'right' }}>
                            👁 {product.viewCount ?? 0}회
                            {typeof product.favoriteCount === 'number' && (
                                <> · ♡ {product.favoriteCount}개</>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    return to ? (
        <Link to={to}>
            {CardInner}
        </Link>
    ) : (
        CardInner
    );
};

export default ProductCard;
