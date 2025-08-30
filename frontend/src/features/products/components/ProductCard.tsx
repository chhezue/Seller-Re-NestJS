// ProductCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../hooks/useProducts';
import ImageGallery from '../components/ImageGallery';

type Props = {
    product: Product;
    to?: string;
    index?: number;
    className?: string;
    showRegion?: boolean;
    showTime?: boolean;
    showCounts?: boolean;
};

// 👁 Lucide eye
const EyeIcon: React.FC<{ className?: string; title?: string }> = ({ className, title }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden={title ? undefined : true}
        role={title ? 'img' : 'presentation'}
    >
        {title ? <title>{title}</title> : null}
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

// ❤ Lucide heart (카운트용: 라인 아이콘)
const HeartIcon: React.FC<{ className?: string; title?: string }> = ({ className, title }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden={title ? undefined : true}
        role={title ? 'img' : 'presentation'}
    >
        {title ? <title>{title}</title> : null}
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
);

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
                    src={product.imageUrl || '/images/default2.jpg'}
                    alt={product.name}
                    className="product-image"
                />
            </div>

            <div className="item-info">
                <h3 className="truncate-text">{product.name}</h3>

                <p className="price-info">
                    {product.tradeType === 'SHARE' ? '나눔' : `${product.price.toLocaleString()}원`}
                </p>

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
                        <p className="extra-info" style={{ margin: 0, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="views" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <EyeIcon className="eye-icon" /> {product.viewCount ?? 0}회
                            </span>
                            {typeof product.favoriteCount === 'number' && (
                                <span className="favs" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <HeartIcon className="heart-icon" /> {product.favoriteCount}개
                                </span>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    return to ? <Link to={to}>{CardInner}</Link> : CardInner;
};

export default ProductCard;
