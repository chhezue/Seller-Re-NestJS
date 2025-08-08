import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuth from '../../auth/hooks/useAuth';
import './ProductDetailPage.css';

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<any>(null);

    const { userId, initialized } = useAuth(); // 현재 로그인 사용자 ID

    useEffect(() => {
    const fetchProduct = async () => {
        const token = localStorage.getItem("accessToken");

        if (!token) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
        }

        try {
        const response = await fetch(`http://127.0.0.1:3000/api/product/${id}`, {
            headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('상품 데이터:', data);
        setProduct(data);
        } catch (error) {
        console.error('상품 데이터 불러오기 실패:', error);
        }
    };

    fetchProduct();
    }, [id, navigate]);


    const formatRelativeTime = (isoDate?: string) => {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();

        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return '방금 전';
        if (diffMin < 60) return `${diffMin}분 전`;
        if (diffHour < 24) return `${diffHour}시간 전`;
        return `${diffDay}일 전`;
    };

    const handleDelete = async () => {
        const confirmDelete = window.confirm('정말로 이 상품을 삭제하시겠습니까?');
        if (!confirmDelete) return;

        try {
            const response = await fetch('http://127.0.0.1:3000/api/product', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id }) // ✅ id만 전송
            });

            if (response.ok) {
            alert('상품이 삭제되었습니다.');
            navigate('/homepage');
            } else {
            const errorText = await response.text();
            alert(`삭제 실패: ${errorText}`);
            }
        } catch (error) {
            console.error('삭제 중 오류:', error);
            alert('서버 오류로 삭제에 실패했습니다.');
        }
    };



    const getDisplayTime = (updatedAt?: string, createdAt?: string) => {
        const baseTime = updatedAt || createdAt;
        return formatRelativeTime(baseTime);
    };

    if (!product || !initialized) return <p>로딩 중...</p>;

    const isAuthor = product.author?.id === userId;

    const handleEdit = () => {
        navigate(`/UpDateProductPage/${id}`);
    };

    // 상태 라벨 한글 변환 및 스타일 결정
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
                        {/* 판매중은 숨김, 예약중/판매완료만 표시 */}
                        {product.status !== 'ON_SALE' && (
                            <span className={`status-label ${statusClass}`}>{statusText}</span>
                        )}
                        <h2 className="product_name">{product.name}</h2>
                    </div>

                    <p className="category-time">
                        {product.category?.name || '기타'} | {getDisplayTime(product.updatedAt, product.createdAt)}
                    </p>

                    <p className={`price-line ${product.isNegotiable ? 'yes' : 'no'}`}>
                        {product.tradeType === 'SHARE'
                            ? '나눔'
                            : `가격: ${product.price.toLocaleString()}원 ${product.isNegotiable ? '(✅ 제안 가능)' : '(🚫 제안 불가)'}`}
                    </p>
                    <p className="description">설명: {product.description}</p>

                    <p className="detail-stats">
                        💬 채팅 0 | ❤️ 관심 {product.favoriteCount ?? 0} | 👁 조회 {product.viewCount ?? 0}
                    </p>

                    {/* 버튼: 작성자 여부 + 상태에 따라 분기 */}
                    {isAuthor ? (
                        <div className="author-buttons">
                            <button className="edit-post-button" onClick={handleEdit}>
                            ✏️ 수정하기
                            </button>
                            <button className="delete-post-button" onClick={() => handleDelete()}>
                            🗑️ 삭제하기
                            </button>
                        </div>
                    ) : product.status === 'SOLD' ? (
                        <button className="contact-seller-button disabled" disabled>
                            거래 완료됨
                        </button>
                    ) : (
                        <button className="contact-seller-button">
                            판매자와 거래하기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductDetailPage;
