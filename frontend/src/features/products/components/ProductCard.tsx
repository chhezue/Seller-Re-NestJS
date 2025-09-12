// ProductCard.tsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../hooks/useProducts';

type Props = {
    product: Product;
    to?: string;
    index?: number;
    className?: string;
    showRegion?: boolean;
    showTime?: boolean;
    showCounts?: boolean;
};

const API_BASE = 'http://127.0.0.1:3000';
const toAbsUrl = (u?: string) =>
    !u ? '' : /^https?:\/\//i.test(u) ? u : `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`;

// 👁 Lucide eye
const EyeIcon: React.FC<{ className?: string; title?: string }> = ({ className, title }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : 'presentation'}>
        {title ? <title>{title}</title> : null}
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

// ❤ Lucide heart (카운트용: 라인 아이콘)
const HeartIcon: React.FC<{ className?: string; title?: string }> = ({ className, title }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : 'presentation'}>
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
    const timeText = formatRelativeTime(product.createdAt);

    // ✅ 서버가 내려주는 조회수 필드: views 우선, 없으면 viewCount 폴백
    const views = (product as any).views ?? 0;
    const likesCount = (product as any).likesCount ?? product.favoriteCount ?? 0;

    // ✅ 첫 번째 이미지 URL 계산 (images[0].file.url 우선)
    const firstImageUrl = useMemo(() => {
        const imgs: any[] = Array.isArray((product as any)?.images) ? (product as any).images : [];
        if (imgs.length > 0) {
            const sorted = [...imgs].sort((a, b) => {
                const ar = a?.isRepresentative ? -1 : 0;
                const br = b?.isRepresentative ? -1 : 0;
                if (ar !== br) return ar - br;
                const ao = a?.order ?? 0;
                const bo = b?.order ?? 0;
                return ao - bo;
            });
            const head = sorted[0] ?? imgs[0];
            const raw =
                head?.file?.url ??
                head?.url ??
                head?.tempUrl ??
                head?.fileUrl ??
                head?.path ??
                '';
            if (raw) return toAbsUrl(raw);
        }
        if (product.imageUrl) return toAbsUrl(product.imageUrl);
        return '/images/default2.jpg';
    }, [product]);

    const CardInner = (
        <div className={`item-card fade-in ${className}`} style={{ ['--delay' as any]: `${(index % 12) * 40}ms` }}>
            <div className="image-wrapper">
                {renderStatusBadge(product.status)}
                <img
                    src={firstImageUrl}
                    alt={product.name}
                    className="product-image"
                    loading="lazy"
                    decoding="async"
                />
            </div>

            <div className="item-info">
                <h3 className="truncate-text">{product.name}</h3>

                <p className="price-info">
                    {product.tradeType === 'SHARE' ? '나눔' : `${product.price.toLocaleString()}원`}
                </p>

                <div
                    className="item-meta-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                >
                    <span className="region-chip">
                        {showRegion && (regionLabel || '지역 미지정')}
                        {showRegion && showTime && ' · '}
                        {showTime && timeText}
                    </span>

                    {showCounts && (
                        <p
                            className="extra-info"
                            style={{ margin: 0, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <span className="views" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <EyeIcon className="eye-icon" /> {views}회
                            </span>
                            <span className="favs" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <HeartIcon className="heart-icon" /> {likesCount}개
                            </span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    // ✅ API 호출 제거: 단순 링크만 유지
    return to ? <Link to={to}>{CardInner}</Link> : CardInner;
};

export default ProductCard;
