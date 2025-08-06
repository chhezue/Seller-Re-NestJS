import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './ProductDetailPage.css';

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<any>(null);

    useEffect(() => {
    const fetchProduct = async () => {
        const response = await fetch(`http://127.0.0.1:3000/api/product/${id}`);
        const data = await response.json();
       // console.log('받은 상품 데이터:', data);
        setProduct(data);
    };

    fetchProduct();
    }, [id]);

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

    const getDisplayTime = (updatedAt?: string, createdAt?: string) => {
    const baseTime = updatedAt || createdAt;
    return formatRelativeTime(baseTime);
    };

    if (!product) return <p>로딩 중...</p>;

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
            {/* 상태 + 이름 */}
            <div className="product-title-row">
            <span className={`status-label ${product.status === 'ON_SALE' ? 'on-sale' : 'sold-out'}`}>
                {product.status === 'ON_SALE' ? '판매중' : '판매완료'}
            </span>
            <h2 className="product_name">{product.name}</h2>
            </div>

            <p className="category-time">
            {product.category?.name || '기타'} | {getDisplayTime(product.updatedAt, product.createdAt)}
            </p>

            <p className={`price-line ${product.isNegotiable ? 'yes' : 'no'}`}>
            가격: {product.price.toLocaleString()}원 
            {product.isNegotiable ? ' (✅ 제안 가능)' : ' (🚫 제안 불가)'}
            </p>

            <p className="description">설명: {product.description}</p>

            {/* 채팅 | 관심 | 조회 */}
            <p className="detail-stats">
            💬 채팅 0 | ❤️ 관심 {product.favoriteCount ?? 0} | 👁 조회 {product.viewCount ?? 0}
            </p>

            <button className="contact-seller-button">판매자와 거래하기</button>
        </div>
        </div>
    </div>
    );
};

export default ProductDetailPage;
