// features/products/components/ImageGallery.tsx
import React, { useEffect, useState } from 'react';
import { useProductDetail } from '../hooks/useProducts';
import './ImageGallery.css';

const API_BASE = 'http://127.0.0.1:3000';

const toAbsUrl = (u?: string) =>
    !u ? '' : /^https?:\/\//i.test(u) ? u : `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`;

function buildImageUrls(product: any): string[] {
    const out: string[] = [];

    const raw = Array.isArray(product?.images) ? product.images : [];
    if (raw.length > 0) {
        const sorted = [...raw].sort((a, b) => {
            const ar = a?.isRepresentative ? -1 : 0;
            const br = b?.isRepresentative ? -1 : 0;
            if (ar !== br) return ar - br;
            const ao = a?.order ?? 0;
            const bo = b?.order ?? 0;
            return ao - bo;
        });

        for (const it of sorted) {
            const url =
                it?.file?.url ??
                it?.url ??
                it?.tempUrl ??
                it?.fileUrl ??
                it?.path ??
                '';
            if (url) out.push(toAbsUrl(url));
        }
    }

    if (out.length === 0 && product?.imageUrl) {
        out.push(toAbsUrl(product.imageUrl));
    }
    return out;
}

/* ✅ 이제 선택된 항목을 빼지 않고 0~4를 그대로 반환 */
function calcThumbIndexes(total: number) {
    const max = Math.min(5, total);
    return Array.from({ length: max }, (_, i) => i);
}

type Props = {
    productId: string;
    className?: string;
};

const ImageGallery: React.FC<Props> = ({ productId, className }) => {
    const { product, loading, error } = useProductDetail(productId);
    const [selected, setSelected] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    useEffect(() => {
        setSelected(0);
    }, [productId, product?.id]);

    useEffect(() => {
        if (!lightboxOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [lightboxOpen]);

    if (loading) {
        return <div className={className}>이미지를 불러오는 중…</div>;
    }
    if (error) {
        return <div className={className}>이미지를 불러오지 못했습니다: {error}</div>;
    }

    const imageUrls = buildImageUrls(product);
    if (imageUrls.length === 0) {
        return <div className={className}>등록된 이미지가 없습니다.</div>;
    }

    const safeSelected = Math.min(selected, imageUrls.length - 1);
    const mainSrc = imageUrls[safeSelected] || imageUrls[0];
    const thumbIndexes = calcThumbIndexes(imageUrls.length);

    return (
        <div className={className}>
            {/* 메인 이미지 */}
            <div
                className="gallery-main"
                onClick={() => setLightboxOpen(true)}
                title="클릭하여 크게 보기"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLightboxOpen(true); }}
            >
                <img
                    src={mainSrc}
                    alt={`상품 이미지 ${safeSelected + 1}`}
                    className="gallery-main-img"
                />
            </div>

            {/* 썸네일: 0~4 전부 + 선택된 썸네일 보라색 보더 */}
            {thumbIndexes.length > 0 && (
                <div className="gallery-thumbs">
                    {thumbIndexes.map((imgIdx) => {
                        const isActive = imgIdx === safeSelected;
                        return (
                            <button
                                key={`thumb-${imgIdx}`}
                                type="button"
                                onClick={() => setSelected(imgIdx)}
                                title={`이미지 ${imgIdx + 1}`}
                                aria-pressed={isActive}
                                className={`thumb-btn${isActive ? ' selected' : ''}`}
                            >
                                <img
                                    src={imageUrls[imgIdx]}
                                    alt={`썸네일 ${imgIdx + 1}`}
                                    className="thumb-img"
                                />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 라이트박스 */}
            {lightboxOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="lightbox-backdrop"
                    onClick={() => setLightboxOpen(false)}
                >
                    <img
                        src={mainSrc}
                        alt="원본 이미지"
                        onClick={(e) => e.stopPropagation()}
                        className="lightbox-image"
                    />
                </div>
            )}
        </div>
    );
};

export default ImageGallery;
