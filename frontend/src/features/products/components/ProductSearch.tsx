// features/products/components/ProductSearch.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ProductSearch.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { usePopularProducts, Product } from '../hooks/useProducts';
import type { Profile } from '../../profile/hooks/useProfile';

type Featured = {
    id?: string;
    name: string;
    priceLabel: string;
    regionLabel: string;
    thumbUrl?: string;
    /** 👇 추가: 조회/찜 표시용 */
    views: number;
    likes: number;
};

interface ProductSearchProps {
    onSearch: (keyword: string) => void;
    initialKeyword?: string;
    loggedIn?: boolean;
    userRegionName?: string;
    profile?: Profile | null;
}

/** 👁 Lucide eye */
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

/** ❤ Lucide heart (outline) */
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

const formatPrice = (n?: number) =>
    typeof n === 'number' ? n.toLocaleString('ko-KR') : '';

const toAbsUrl = (raw?: string) => {
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    try {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        const path = raw.startsWith('/') ? raw : `/${raw}`;
        return `${base}${path}`;
    } catch {
        return raw;
    }
};

const resolveUserRegionName = (explicit?: string): string => {
    if (explicit && explicit.trim()) return explicit.trim();

    if (typeof window !== 'undefined') {
        const directKeys = ['userRegionName', 'regionName', 'region', 'addressRegion'];
        for (const k of directKeys) {
            const v = window.localStorage.getItem(k);
            if (v && v.trim()) return v.trim();
        }
        const jsonKeys = ['me', 'user', 'profile', 'currentUser'];
        for (const k of jsonKeys) {
            const raw = window.localStorage.getItem(k);
            if (!raw) continue;
            try {
                const obj = JSON.parse(raw);
                const candidates = [
                    obj?.region?.name,
                    obj?.address?.region,
                    obj?.location?.regionName,
                    obj?.regionName,
                ];
                for (const c of candidates) {
                    if (typeof c === 'string' && c.trim()) return c.trim();
                }
            } catch {}
        }
    }
    return '';
};

const getFirstImageUrl = (p: Product): string => {
    const anyP: any = p;
    const imgs: any[] = Array.isArray(anyP?.images) ? anyP.images : [];

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

        if (Array.isArray(head?.files) && head.files.length > 0) {
            const f0 = head.files[0];
            if (typeof f0?.url === 'string' && f0.url) return toAbsUrl(f0.url);
        }

        const raw =
            head?.file?.url ??
            head?.url ??
            head?.tempUrl ??
            head?.fileUrl ??
            head?.path ??
            '';

        if (raw) return toAbsUrl(raw);
    }

    if (typeof anyP?.imageUrl === 'string' && anyP.imageUrl) {
        return toAbsUrl(anyP.imageUrl);
    }

    return '/images/default2.jpg';
};

/** ✅ 조회수/찜수 포함 Featured 매핑 */
const productToFeatured = (p: Product): Featured => {
    const anyP: any = p;
    const views = Number(anyP.views ?? p.viewCount ?? 0);
    const likes = Number(anyP.likesCount ?? p.favoriteCount ?? 0);

    return {
        id: p.id,
        name: p.name,
        priceLabel: formatPrice(p.price),
        regionLabel: p.region?.name || p.author?.region?.name || '',
        thumbUrl: getFirstImageUrl(p),
        views,
        likes,
    };
};

const ProductSearch: React.FC<ProductSearchProps> = ({
    onSearch,
    initialKeyword = '',
    loggedIn,
    userRegionName,
    profile,
}) => {
    const [searchTerm, setSearchTerm] = useState(initialKeyword);
    const lastSent = useRef<string>(initialKeyword);

    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() =>
        typeof loggedIn === 'boolean'
            ? loggedIn
            : !!(typeof window !== 'undefined' && localStorage.getItem('accessToken'))
    );

    // ✅ UserProfile과 동일한 우선순위로 지역명 계산
    const regionName = useMemo(() => {
        const fromProfile =
            profile?.region?.name ||
            (profile as any)?.regionFullName ||
            (profile as any)?.region_id ||
            '';
        return (fromProfile && String(fromProfile).trim())
            || (userRegionName?.trim() ?? '')
            || resolveUserRegionName(userRegionName);
    }, [profile, userRegionName]);

    useEffect(() => {
        if (typeof loggedIn === 'boolean') {
            setIsLoggedIn(loggedIn);
            return;
        }
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'accessToken') {
                setIsLoggedIn(!!localStorage.getItem('accessToken'));
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [loggedIn]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchTerm.trim();
        if (q === lastSent.current) return;
        lastSent.current = q;
        onSearch(q);
    };

    const handleClear = () => {
        setSearchTerm('');
        lastSent.current = '';
        onSearch('');
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'Escape') handleClear();
        if (e.key === 'Enter') {
            const q = searchTerm.trim();
            if (q !== lastSent.current) {
                lastSent.current = q;
                onSearch(q);
            }
        }
    };

    // 인기 상품을 넉넉히 받아서 (조회수 + 찜수) 점수 기준 상위 3개로 선정
    const { popular, popularLoading } = usePopularProducts({ limit: 20, status: 'ON_SALE' });

    // ✅ (views + likes) 점수 내림차순, 동률 최신순 → Featured 리스트
    const featuredList: Featured[] = useMemo(() => {
        const scored = popular.map((p) => {
            const views = (p as any).views ?? p.viewCount ?? 0;
            const likes = (p as any).likesCount ?? p.favoriteCount ?? 0;
            const score = Number(views) + Number(likes);
            const ts = new Date(p.updatedAt || p.createdAt || 0).getTime();
            return { p, score, ts };
        });

        scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.ts - a.ts;
        });

        return scored.slice(0, 3).map(({ p }) => productToFeatured(p));
    }, [popular]);

    const [idx, setIdx] = useState(0);
    useEffect(() => { setIdx(0); }, [popular.length]);

    // 자동 슬라이드 제어
    const [paused, setPaused] = useState(false);
    const multiple = featuredList.length >= 2;
    useEffect(() => {
        if (!multiple || popularLoading || paused) return;
        const id = window.setInterval(() => {
            setIdx((i) => (i + 1) % featuredList.length);
        }, 5000);
        return () => window.clearInterval(id);
    }, [multiple, paused, popularLoading, featuredList.length]);

    const hasCarousel = featuredList.length >= 1;

    return (
        <section className="ps-hero">
            <div className="ps-hero-left">
                <div className="ps-title-row">
                    <h2 className="ps-title">
                        {isLoggedIn
                            ? `${regionName || 'Seller-Re'}에서 거래하고 싶은 상품을 찾아보세요.`
                            : '내 동네에서 중고거래를 시작해보세요.'}
                    </h2>
                    {!isLoggedIn && (
                        <a className="ps-cta" href="/register">가입하고 거래하기</a>
                    )}
                </div>

                {isLoggedIn ? (
                    <form className="search-form search-form--inset" onSubmit={handleSubmit} role="search" aria-label="상품 검색">
                        <input
                            type="text"
                            placeholder="궁금한 물건을 입력해보세요"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            aria-label="상품명 검색"
                        />
                        <button type="submit" className="search-button ps-search-btn--inset" aria-label="검색">
                            <FontAwesomeIcon icon={faSearch} />
                        </button>
                    </form>
                ) : (
                    <form className="ps-search search-form--inset" onSubmit={handleSubmit} role="search" aria-label="상품 검색">
                        <input
                            type="text"
                            placeholder="궁금한 물건을 입력해보세요"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            aria-label="상품명 검색"
                        />
                        <button type="submit" className="ps-search-btn--inset" aria-label="검색">
                            <FontAwesomeIcon icon={faSearch} />
                        </button>
                    </form>
                )}
            </div>

            {hasCarousel && (
                <aside
                    className="ps-hero-right"
                    aria-label="이웃들이 주목하는 상품"
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    onFocusCapture={() => setPaused(true)}
                    onBlurCapture={() => setPaused(false)}
                >
                    <div className="ps-card-stack">
                        {Array.from({ length: Math.min(3, featuredList.length) }).map((_, i) => {
                            const item = featuredList[(idx + i) % featuredList.length];
                            const role = i; // 0=front, 1=middle, 2=back
                            const isFront = role === 0;
                            const z = 3 - i;

                            return (
                                <article
                                    key={item.id || `${item.name}-${i}`}
                                    className={`ps-card ps-card--stack ${isFront ? 'is-front' : role === 1 ? 'is-middle' : 'is-back'} ps-animate-in`}
                                    style={{ zIndex: z, pointerEvents: isFront ? 'auto' : 'none' }}
                                    aria-hidden={!isFront}
                                    tabIndex={isFront ? 0 : -1}
                                >
                                    <div className="ps-card-head">
                                        <span>이웃들이 주목하는 상품</span>
                                        {multiple && isFront && (
                                            <button
                                                className="ps-card-next ps-card-next--inset"
                                                type="button"
                                                aria-label="다음"
                                                onClick={() => setIdx((i2) => (i2 + 1) % featuredList.length)}
                                                disabled={popularLoading}
                                            >
                                                <FontAwesomeIcon icon={faChevronRight} />
                                            </button>
                                        )}
                                    </div>

                                    <Link className="ps-card-body ps-card-body--stack" to={item.id ? `/item/${item.id}` : '#'}>
                                        <div className="ps-thumb">
                                            <img src={item.thumbUrl || '/images/default2.jpg'} alt={item.name} loading="lazy" />
                                        </div>

                                        <div className="ps-info">
                                            <div className="ps-name" title={item.name}>{item.name}</div>
                                            <div className="ps-price">{item.priceLabel}</div>

                                            {/* ✅ 지역(왼쪽) / 조회·찜(오른쪽) 분리 배치 */}
                                            <div className="ps-meta-row">
                                                <span className="ps-region">{item.regionLabel}</span>

                                                <span className="ps-counts">
                                                    <span
                                                        className="views"
                                                        title="조회수"
                                                    >
                                                        <EyeIcon className="eye-icon" /> {item.views}
                                                    </span>
                                                    <span
                                                        className="likes"
                                                        title="찜"
                                                    >
                                                        <HeartIcon className="heart-icon" /> {item.likes}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </article>
                            );
                        })}
                    </div>
                </aside>
            )}
        </section>
    );
};

export default ProductSearch;
