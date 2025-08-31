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

    // ✅ 서버 응답을 initial.images 형식으로 정규화
    const initialImages =
        Array.isArray((product as any)?.images) && (product as any).images.length > 0
            ? (product as any).images.map((it: any, i: number) => ({
                fileId: it?.fileId ?? it?.file?.id ?? it?.id ?? '',
                order: typeof it?.order === 'number' ? it.order : i,
                isRepresentative: Boolean(it?.isRepresentative),
                file: {
                    id: it?.file?.id ?? it?.fileId ?? it?.id ?? '',
                    url: it?.file?.url ?? it?.url ?? it?.tempUrl ?? it?.fileUrl ?? it?.path ?? '',
                },
                }))
            : // 폴백: 단일 대표 이미지만 있는 경우
            (product as any)?.imageUrl
            ? [
                {
                    fileId: '',
                    order: 0,
                    isRepresentative: true,
                    file: { id: '', url: (product as any).imageUrl },
                },
                ]
            : [];

    const initial = {
        name: product?.name ?? '',
        description: product?.description ?? '',
        categoryId: product?.category?.id ?? '',
        price: product?.tradeType === 'SHARE' ? 0 : (product?.price ?? 0),
        status: product?.status ?? 'ON_SALE',
        tradeType: product?.tradeType ?? 'SELL',
        condition: product?.condition ?? 'USED',
        isNegotiable: product?.tradeType === 'SHARE' ? false : !!product?.isNegotiable,
        imageUrl: product?.imageUrl,     // (폴백용)
        images: initialImages,           // ✅ 핵심: 수정 모드 썸네일 채우기
    };

    return <ProductForm mode="update" productId={id} initial={initial} />;
};

export default UpDateProductPage;
