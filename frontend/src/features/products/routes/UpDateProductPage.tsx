// features/products/routes/UpDateProductPage.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useProductDetail } from '../hooks/useProducts';
import ProductForm from '../../products/components/ProductForm';

const UpDateProductPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { product, loading, error } = useProductDetail(id);

    if (loading) {
        return (
            <div className="new-product-center">
                <p>로딩 중...</p>
            </div>
        );
    }
    if (!id || error) {
        return (
            <div className="new-product-center">
                <p className="error-message center">{error || '상품을 찾을 수 없습니다.'}</p>
            </div>
        );
    }

    const initial = {
        name: product?.name ?? '',
        description: product?.description ?? '',
        categoryId: product?.category?.id ?? '',
        price: product?.tradeType === 'SHARE' ? 0 : (product?.price ?? 0),
        status: product?.status ?? 'ON_SALE',
        tradeType: product?.tradeType ?? 'SELL',
        condition: product?.condition ?? 'USED',
        isNegotiable: product?.tradeType === 'SHARE' ? false : !!product?.isNegotiable,
        imageUrl: product?.imageUrl,          // 단일 이미지가 있다면
        // imageUrls: product?.imageUrls ?? [], // 여러 장을 서버가 준다면 이 라인 사용
    };

    return <ProductForm mode="update" productId={id} initial={initial} />;
};

export default UpDateProductPage;
