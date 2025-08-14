// features/products/routes/ProductDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuth from '../../auth/hooks/useAuth';
import './ProductDetailPage.css';
import { useProductActions, useProductDetail } from '../hooks/useProducts';

/** 확인 모달 */
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

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { userId, initialized } = useAuth();

    const { product, loading, error, errorStatus } = useProductDetail(id);

    // 훅에 toggleFavorite 이 있으면 사용(없어도 안전)
    const { deleteProduct, toggleFavorite } = useProductActions() as any;

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // 🔖 찜 상태/카운트 로컬 관리
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

    /** 실제 삭제 요청 */
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

    const getDisplayTime = (updatedAt?: string, createdAt?: string) => {
        const baseTime = updatedAt || createdAt;
        return formatRelativeTime(baseTime);
    };

    if (loading || !initialized) return <p>로딩 중...</p>;
    if (!product) return <p>상품을 불러오지 못했습니다.</p>;

    const isAuthor = product.author?.id === userId;

    const handleEdit = () => {
        navigate(`/UpDateProductPage/${id}`);
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    // ❤️ 찜하기
    const handleToggleFavorite = async () => {
        if (!id) return;
        try {
            if (typeof toggleFavorite === 'function') {
                const res = await toggleFavorite(id);
                const nextFav = res?.isFavorited ?? !isFavorited;
                setIsFavorited(nextFav);
                setFavoriteCount((prev) => Math.max(0, prev + (nextFav ? 1 : -1)));
            } else {
                const nextFav = !isFavorited;
                setIsFavorited(nextFav);
                setFavoriteCount((prev) => Math.max(0, prev + (nextFav ? 1 : -1)));
            }
            toast.success(isFavorited ? '찜을 해제했어요.' : '찜했어요!');
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

    // 🚩 신고하기
    const handleReport = () => {
        navigate(`/report?productId=${id}`);
    };

    // 💬 채팅하기
    const handleChat = () => {
        if (product.status === 'SOLD') return;
        toast.success('채팅을 시작합니다!');
        // navigate(`/chat/${product.author?.id}?product=${id}`);
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ON_SALE':
                return { text: '판매중', className: 'on-sale' };
            case 'RESERVED':
                return { text: '예약중', className: 'reserved' };
            case 'SOLD':
                return { text: '판매완료', className: 'sold-out' };
            default:
                return { text: '상태 알 수 없음', className: '' };
        }
    };

    const { text: statusText, className: statusClass } = getStatusLabel(product.status);

    return (
        <div className="product-detail-container">
            <div className="product-detail-content">
                <div className="product-image-section">
                    <img
                        src={product.imageUrl || '/images/default.jpg'}
                        alt={product.name}
                        className="product-image"
                    />
                </div>

                <div className="product-info-section">
                    <div className="product-title-row">
                        {product.status !== 'ON_SALE' && (
                            <span className={`status-label ${statusClass}`}>{statusText}</span>
                        )}
                        <h2 className="product_name">{product.name}</h2>
                    </div>

                    <p className="category-time">
                        {product?.region?.name && <>{product.region.name} | </>}
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
                        💬 채팅 0 | ❤️ 관심 {favoriteCount} | 👁 조회 {product.viewCount ?? 0}
                    </p>

                    {isAuthor ? (
                        <div className="author-buttons">
                            <button className="edit-post-button" onClick={handleEdit}>
                                ✏️ 수정하기
                            </button>
                            <button className="delete-post-button" onClick={handleDelete}>
                                🗑️ 삭제하기
                            </button>
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
                        // 🔽 버튼 4개 일렬 (3개 컴팩트 + 채팅 넓게)
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
