import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuth from '../../auth/hooks/useAuth';
import './ProductDetailPage.css';
import { useProductActions, useProductDetail, usePopularProducts } from '../hooks/useProducts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import ProductCard from '../components/ProductCard';
import MannerTemp from '../../../components/ui/MannerTemp';
import ImageGallery from '../components/ImageGallery';

/** ✅ Lucide eye SVG */
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

/** ✅ Lucide message-square-text */
const ChatIcon: React.FC<{ className?: string; title?: string }> = ({ className, title }) => (
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
        <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
        <path d="M7 8h10" />
        <path d="M7 12h8" />
    </svg>
);

/** ✅ Lucide heart (filled 토글 지원) */
const HeartIcon: React.FC<{ filled?: boolean; className?: string; title?: string }> = ({ filled, className, title }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
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

/** 확인 모달 (훅 없음) */
const ConfirmModal: React.FC<{
    open: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({
    open,
    title,
    message,
    confirmText = '확인',
    cancelText = '취소',
    danger,
    onConfirm,
    onCancel,
}) => {
    if (!open) return null;

    const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter') onConfirm();
    };

    return (
        <div className="confirm-backdrop" onClick={onCancel} onKeyDown={handleKey} tabIndex={-1}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                {title && <h3 className="confirm-title">{title}</h3>}
                {message && <p className="confirm-message">{message}</p>}
                <div className="confirm-actions">
                    <button className="btn ghost" onClick={onCancel}>{cancelText}</button>
                    <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
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

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { userId, initialized } = useAuth();

    useEffect((): void => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }, [id]);

    const { product, loading, error, errorStatus } = useProductDetail(id);
    const { deleteProduct, toggleFavorite } = useProductActions() as any;

    // ✅ 인기 상품 훅 (뷰카운트 없으면 최신순, 있으면 조회수 내림차순)
    const {
        popular,
        popularLoading,
        popularError,
    } = usePopularProducts({
        limit: 20,
        status: 'ON_SALE',
        excludeId: id,
        categoryId: product?.category?.id,
    });

    // ✅ 렌더는 안전하게 20개로 슬라이스
    const limitedPopular = useMemo(() => popular.slice(0, 20), [popular]);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isFavorited, setIsFavorited] = useState<boolean>(false);
    const [favoriteCount, setFavoriteCount] = useState<number>(0);

    // 토큰 필요 시 안내
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            toast.info('로그인이 필요합니다.');
            navigate('/login');
        }
    }, [navigate]);

    // 에러 상태 안내
    useEffect(() => {
        if (!error) return;
        if (errorStatus === 401) {
            toast.info('세션이 만료되었거나 로그인되지 않았습니다.');
            navigate('/login');
        } else if (errorStatus) {
            toast.error(error);
        }
    }, [error, errorStatus, navigate]);

    // 초기 찜 상태 세팅
    useEffect(() => {
        setIsFavorited((product as any)?.isFavorited ?? false);
        setFavoriteCount(product?.favoriteCount ?? 0);
    }, [product?.id, (product as any)?.isFavorited, product?.favoriteCount]);

    if (loading || !initialized) return <p>로딩 중...</p>;
    if (!product) return <p>상품을 불러오지 못했습니다.</p>;

    const getDisplayTime = (u?: string, c?: string) => formatRelativeTime(u || c);

    const isAuthor = product.author?.id === userId;

    const handleEdit = () => navigate(`/UpDateProductPage/${id}`);
    const handleDelete = () => setShowDeleteConfirm(true);

    const doDelete = async () => {
        if (!id) return;
        try {
            await deleteProduct(id);
            toast.success('상품이 삭제되었습니다.');
            navigate('/homepage');
        } catch (e: any) {
            if (e?.code === 'NOT_AUTHENTICATED' || e?.status === 401) {
                toast.info('로그인이 필요합니다.');
                navigate('/login');
                return;
            }
            if (e?.status === 403) {
                toast.error('권한이 없습니다. 본인이 등록한 상품만 삭제할 수 있습니다.');
                return;
            }
            toast.error(e?.message ?? '서버 오류로 삭제에 실패했습니다.');
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    // ❤️ 찜하기
    const handleToggleFavorite = async () => {
        if (!id) return;
        try {
            let next: boolean;
            if (typeof toggleFavorite === 'function') {
                const res = await toggleFavorite(id);
                next = res?.isFavorited ?? !isFavorited;
            } else {
                next = !isFavorited;
            }
            setIsFavorited(next);
            setFavoriteCount((p) => Math.max(0, p + (next ? 1 : -1)));
            toast.success(next ? '찜했어요!' : '찜을 해제했어요.');
        } catch (e: any) {
            toast.error(e?.message ?? '찜하기에 실패했습니다.');
        }
    };

    // 🔗 링크 공유
    const handleShare = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: product.name, text: '상품 링크', url });
                return;
            }
            await navigator.clipboard.writeText(url);
            toast.success('링크가 복사되었습니다.');
        } catch {
            try {
                await navigator.clipboard.writeText(url);
                toast.success('링크가 복사되었습니다.');
            } catch {
                toast.error('링크 복사에 실패했습니다.');
            }
        }
    };

    const handleReport = () => navigate(`/report?productId=${id}`);
    const handleChat = () => {
        if (product.status === 'SOLD') return;
        toast.success('채팅을 시작합니다!');
    };

    // 상태 라벨 (Hook 아님)
    const statusInfo = (() => {
        switch (product.status) {
            case 'ON_SALE':
                return { text: '판매중', className: 'on-sale' };
            case 'RESERVED':
                return { text: '예약중', className: 'reserved' };
            case 'SOLD':
                return { text: '판매완료', className: 'sold-out' };
            default:
                return { text: '상태 알 수 없음', className: '' };
        }
    })();

    // 판매자 정보
    const author = product.author;
    const sellerName = (author as any)?.username || (author as any)?.name || '판매자';
    const sellerRegion = author?.region?.name || '';
    const sellerImg = author?.profileImage;
    const ratingAvg = (author as any)?.ratingAvg as number | undefined;
    const ratingCount = (author as any)?.ratingCount as number | undefined;

    return (
        <div className="product-detail-container">
            <div className="product-detail-content">
                <div className="product-image-section">
                    <ImageGallery productId={id!} className="product-image" />

                    {/* 이미지 아래: 판매자 정보 */}
                    <div className="seller-strip">
                        {sellerImg ? (
                            <img className="seller-avatar" src={sellerImg} alt={`${sellerName} 프로필`} />
                        ) : (
                            <div className="seller-avatar-default" aria-label="기본 아바타">
                                <FontAwesomeIcon icon={faUser} />
                            </div>
                        )}
                        <div className="seller-meta">
                            <div className="seller-name-row">
                                <span className="seller-name">{sellerName}</span>
                            </div>
                            <div className="seller-sub">
                                {sellerRegion && <span className="seller-region">{sellerRegion}</span>}
                            </div>
                        </div>
                        <div className="seller-rating-right">
                            <MannerTemp
                                score5={typeof ratingAvg === 'number' ? ratingAvg : 0}
                                count={typeof ratingCount === 'number' ? ratingCount : 0}
                            />
                            <p className="seller-rating-Text" tabIndex={0} data-tip="최근 거래 후기 등을 기반으로 산출되는 신뢰 지표예요. 높을수록 좋아요.">매너온도</p>
                        </div>
                    </div>
                </div>

                <div className="product-info-section">
                    <div className="product-title-row">
                        {product.status !== 'ON_SALE' && (
                            <span className={`status-label ${statusInfo.className}`}>{statusInfo.text}</span>
                        )}
                        <h2 className="product_name">{product.name}</h2>
                    </div>

                    <p className="category-time">
                        {product?.category?.name || '기타'} | {getDisplayTime(product.updatedAt, product.createdAt)}
                    </p>

                    <p className={`price-line ${product.isNegotiable ? 'yes' : 'no'}`}>
                        {product.tradeType === 'SHARE'
                            ? '나눔'
                            : `가격: ${product.price.toLocaleString()}원 ${product.isNegotiable ? '(✅ 제안 가능)' : '(🚫 제안 불가)'}`}
                    </p>

                    {product.description && (
                        <p className="description" style={{ whiteSpace: 'pre-wrap' }}>
                            {product.description}
                        </p>
                    )}

                    <p className="detail-stats">
                        <span className="stat">
                            <ChatIcon className="stats-icon" /> 채팅 0
                        </span>{' '}
                        |{' '}
                        <span className="stat">
                            <HeartIcon className="stats-icon" /> 관심 {favoriteCount}
                        </span>{' '}
                        |{' '}
                        <span className="stat">
                            <EyeIcon className="stats-icon" /> 조회 {product.viewCount ?? 0}
                        </span>
                    </p>

                    {isAuthor ? (
                        <div className="author-buttons">
                            <button className="edit-post-button" onClick={handleEdit}>✏️ 수정하기</button>
                            <button className="delete-post-button" onClick={handleDelete}>🗑️ 삭제하기</button>
                        </div>
                    ) : product.status === 'SOLD' ? (
                        <button
                            className="contact-seller-button disabled"
                            disabled
                            title="이미 거래가 완료된 상품입니다"
                        >
                            거래 완료됨
                        </button>
                    ) : (
                        <div className="buyer-actions four-inline">
                            <button
                                className={`favorite-button xs-action ${isFavorited ? 'on' : ''}`}
                                onClick={handleToggleFavorite}
                                aria-pressed={isFavorited}
                            >
                                {isFavorited ? '❤️ 찜 해제' : '🤍 찜하기'}
                            </button>

                            <button
                                className={`chat-button ${product.status === 'SOLD' ? 'disabled' : ''}`}
                                onClick={handleChat}
                                disabled={product.status === 'SOLD'}
                            >
                                💬 채팅하기
                            </button>

                            <button className="report-button xs-action" onClick={handleReport}>
                                🚩 신고
                            </button>

                            <button className="share-button xs-action" onClick={handleShare}>
                                🔗 공유
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ 인기 상품: 최대 20개, 5열 고정 그리드 */}
            <div className="popular-section">
                <h3 className="popular-title">인기 상품</h3>
                {popularLoading ? (
                    <p className="hint-text">로딩 중…</p>
                ) : popularError ? (
                    <p className="error-text">{popularError}</p>
                ) : limitedPopular.length === 0 ? (
                    <p className="hint-text">표시할 상품이 없어요.</p>
                ) : (
                    <div className="popular-grid">
                        {limitedPopular.map((p, i) => (
                            <div key={p.id} className="popular-card-wrap">
                                <ProductCard
                                    product={p}
                                    to={`/item/${p.id}`}
                                    index={i}
                                    className="popular-mini"
                                    showRegion={true}
                                    showTime={false}
                                    showCounts={false}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmModal
                open={showDeleteConfirm}
                title="상품을 삭제할까요?"
                message="삭제 후 되돌릴 수 없습니다."
                confirmText="삭제하기"
                cancelText="취소"
                danger
                onConfirm={doDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    );
};

export default ProductDetailPage;
