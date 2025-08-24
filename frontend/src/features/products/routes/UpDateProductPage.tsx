// features/products/routes/UpDateProductPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import CategoryDropdown from '../routes/CategoryDropdown';
import './NewProductPage.css';
import { useProductDetail, useProductEnums, useProductActions, useCategories } from '../hooks/useProducts';

type ProductPayload = {
    name: string;
    description: string;
    categoryId: string;
    price: number;
    status: string;
    tradeType: string;
    condition: string;
    isNegotiable: boolean;
};

const ConfirmModal: React.FC<{
    open: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ open, title, message, confirmText = '확인', cancelText = '취소', danger, onConfirm, onCancel }) => {
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

type EnumOption = { key: string; label: string };

const Segmented: React.FC<{
    value: string;
    onChange: (v: string) => void;
    options: EnumOption[];
    disabled?: boolean;
    ariaLabel?: string;
}> = ({ value, onChange, options, disabled, ariaLabel }) => {
    return (
        <div className="seg-group" role="group" aria-label={ariaLabel}>
            {options.map((opt) => (
                <button
                    key={opt.key}
                    type="button"
                    className={`seg-btn ${value === opt.key ? 'active' : ''}`}
                    aria-pressed={value === opt.key}
                    onClick={() => !disabled && onChange(opt.key)}
                    disabled={disabled}
                    title={opt.label}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};

const MAX_IMAGES = 8;

const UpDateProductPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // ✅ API 훅들
    const { product, loading: loadingDetail, error: detailError } = useProductDetail(id);
    const { statusOptions, tradeTypeOptions, conditionOptions, loadingEnums, enumsError } = useProductEnums();
    const { updateProduct } = useProductActions();

    // ✅ 카테고리(API)
    const { categories, loadingCategories, categoriesError } = useCategories();

    // 폼 상태
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState('');

    // 변경 여부 판단
    const [originalData, setOriginalData] = useState<ProductPayload | null>(null);

    // refs
    const titleRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [categoryId, setCategoryId] = useState('');
    const [isNegotiable, setIsNegotiable] = useState(true);
    const [status, setStatus] = useState('ON_SALE');
    const [tradeType, setTradeType] = useState('SELL');
    const [condition, setCondition] = useState('USED');

    const [showConfirm, setShowConfirm] = useState(false);
    const isShare = tradeType === 'SHARE';

    // 훅 에러 표시
    useEffect(() => {
        if (enumsError) setErrorMessage(enumsError);
        if (detailError) setErrorMessage(detailError);
    }, [enumsError, detailError]);

    useEffect(() => {
        if (categoriesError) setErrorMessage(categoriesError);
    }, [categoriesError]);

    // 상세 로딩 완료 → 폼 초기화 & baseline
    useEffect(() => {
        if (!product) return;

        setTitle(product.name || '');
        setPrice(product.tradeType === 'SHARE' ? 0 : (product.price ?? 0));
        setDescription(product.description || '');
        setCategoryId(product.category?.id || '');
        setIsNegotiable(product.tradeType === 'SHARE' ? false : !!product.isNegotiable);
        setStatus(product.status || 'ON_SALE');
        setTradeType(product.tradeType || 'SELL');
        setCondition(product.condition || 'USED');

        // 기존 대표 이미지가 있으면 미리보기 1장 채움
        setPreviewImages(product.imageUrl ? [product.imageUrl] : []);

        const baseline: ProductPayload = {
            name: product.name || '',
            description: product.description || '',
            categoryId: product.category?.id || '',
            price: product.tradeType === 'SHARE' ? 0 : (product.price ?? 0),
            status: product.status || 'ON_SALE',
            tradeType: product.tradeType || 'SELL',
            condition: product.condition || 'USED',
            isNegotiable: product.tradeType === 'SHARE' ? false : !!product.isNegotiable,
        };
        setOriginalData(baseline);
    }, [product]);

    // SHARE 선택 시 자동 처리
    useEffect(() => {
        if (isShare) {
            setPrice(0);
            setIsNegotiable(false);
        }
    }, [isShare]);

    const openFileDialog = () => {
        imageInputRef.current?.click();
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fl = e.target.files;
        if (!fl || fl.length === 0) return;

        const newlySelected = Array.from(fl);
        const keyOf = (f: File) => `${f.name}_${f.size}_${f.lastModified}`;
        const existingKeys = new Set(images.map(keyOf));
        const deduped = newlySelected.filter((f) => !existingKeys.has(keyOf(f)));

        const room = MAX_IMAGES - images.length;
        const toAdd = deduped.slice(0, Math.max(0, room));

        if (toAdd.length < newlySelected.length) {
            toast.info(`이미지는 최대 ${MAX_IMAGES}장까지 등록할 수 있어요.`);
        }
        if (toAdd.length === 0 && images.length >= MAX_IMAGES) {
            e.target.value = '';
            return;
        }

        const nextImages = [...images, ...toAdd];
        const nextPreviews = [...previewImages, ...toAdd.map((f) => URL.createObjectURL(f))];

        setImages(nextImages);
        setPreviewImages(nextPreviews);

        // 같은 파일 재선택 가능하도록 초기화
        e.target.value = '';
    };

    const handleRemoveImage = (index: number) => {
        const nextImages = images.slice();
        const nextPreviews = previewImages.slice();
        const removedUrl = nextPreviews[index];
        nextImages.splice(index, 1);
        nextPreviews.splice(index, 1);
        try {
            if (removedUrl?.startsWith('blob:')) URL.revokeObjectURL(removedUrl);
        } catch {}
        setImages(nextImages);
        setPreviewImages(nextPreviews);
    };

    const focusAndScroll = (el: Element | null) => {
        if (!el) return;
        const node = el as HTMLElement;
        node.focus?.();
        node.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    };

    const scrollErrorMessage = () => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const shallowEqual = (a: Record<string, any>, b: Record<string, any>) => {
        const ak = Object.keys(a);
        const bk = Object.keys(b);
        if (ak.length !== bk.length) return false;
        for (const k of ak) {
            if (a[k] !== b[k]) return false;
        }
        return true;
    };

    // PATCH 실행(훅 호출)
    const doSubmit = async () => {
        if (!title) {
            setErrorMessage('상품명을 입력하세요.');
            focusAndScroll(titleRef.current);
            scrollErrorMessage();
            setShowConfirm(false);
            return;
        }
        if (!isShare && (!price || price <= 0)) {
            setErrorMessage('가격을 입력하세요.');
            focusAndScroll(priceRef.current);
            scrollErrorMessage();
            setShowConfirm(false);
            return;
        }
        if (!description) {
            setErrorMessage('설명을 입력하세요.');
            focusAndScroll(descRef.current);
            scrollErrorMessage();
            setShowConfirm(false);
            return;
        }
        if (!categoryId) {
            setErrorMessage('카테고리를 선택하세요.');
            focusAndScroll(categoryRef.current);
            scrollErrorMessage();
            setShowConfirm(false);
            return;
        }

        if (!id) return;

        const productData: ProductPayload = {
            name: title,
            description,
            categoryId,
            price: isShare ? 0 : price,
            status,
            tradeType,
            condition,
            isNegotiable: isShare ? false : isNegotiable,
        };

        if (originalData && shallowEqual(productData, originalData)) {
            toast.info('수정된 데이터가 없습니다.');
            setShowConfirm(false);
            return;
        }

        try {
            const updated = await updateProduct(id, productData);

            // baseline 갱신
            setOriginalData({
                name: updated.name ?? productData.name,
                description: updated.description ?? productData.description,
                categoryId: productData.categoryId,
                price: typeof updated.price === 'number' ? updated.price : productData.price,
                status: updated.status ?? productData.status,
                tradeType: updated.tradeType ?? productData.tradeType,
                condition: updated.condition ?? productData.condition,
                isNegotiable:
                    typeof updated.isNegotiable === 'boolean'
                        ? updated.isNegotiable
                        : productData.isNegotiable,
            });

            toast.success('상품 수정 성공!');
            navigate(`/item/${id}`);
        } catch (e: any) {
            if (e?.code === 'NOT_AUTHENTICATED') {
                toast.info('로그인이 필요합니다.');
                navigate('/login');
            } else if (e?.status === 403) {
                toast.error('권한이 없습니다. 본인이 등록한 상품만 수정할 수 있습니다.');
            } else if (e?.status === 404) {
                toast.error('상품을 찾을 수 없습니다.');
            } else {
                setErrorMessage(e?.message ?? '상품 수정에 실패했습니다.');
                scrollErrorMessage();
            }
        } finally {
            setShowConfirm(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    if (loadingDetail) {
        return (
            <div className="new-product-center">
                <p>로딩 중...</p>
            </div>
        );
    }

    return (
        <div className="new-product-center">
            <h2 className="page-title">상품 수정</h2>

            {(errorMessage || detailError) && (
                <p ref={errorRef} className="error-message center">
                    {errorMessage || detailError}
                </p>
            )}

            <form className="cards" onSubmit={handleSubmit}>
                {/* 카드 1: 이미지 수정 */}
                <section className="card">
                    <h3 className="card-title">이미지 수정</h3>

                    {/* 숨김 파일 입력 */}
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                    />

                    {/* 드롭존 */}
                    <div
                        className="dropzone"
                        role="button"
                        tabIndex={0}
                        onClick={() => imageInputRef.current?.click()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') imageInputRef.current?.click();
                        }}
                        aria-label="이미지 추가: 최소 1개, 최대 8개까지 가능"
                    >
                        {previewImages.length === 0 ? (
                            <div className="dropzone-empty">
                                <div className="dropzone-plus">＋</div>
                                <div className="dropzone-text">이미지 추가</div>
                                <div className="dropzone-sub">최소 1개, 최대 8개까지 가능</div>
                            </div>
                        ) : (
                            <div className="preview-grid inside-dropzone">
                                {previewImages.map((src, idx) => (
                                    <div className="thumb" key={idx}>
                                        <img src={src} alt={`preview-${idx}`} />
                                        <button
                                            type="button"
                                            className="thumb-remove"
                                            aria-label="이미지 삭제"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveImage(idx);
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                {previewImages.length < MAX_IMAGES && (
                                    <button
                                        type="button"
                                        className="thumb add-more"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            imageInputRef.current?.click();
                                        }}
                                        title="이미지 추가"
                                    >
                                        <span>＋</span>
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="count-badge">{previewImages.length}/{MAX_IMAGES}</div>
                    </div>

                    <p className="help-text">최소 1개, 최대 8개까지 가능</p>
                </section>

                {/* 카드 2: 기본 정보 */}
                <section className="card">
                    <h3 className="card-title">기본 정보</h3>

                    <label className="form-label">
                        <span>상품명</span>
                        <input
                            ref={titleRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="상품명을 입력하세요"
                        />
                    </label>

                    <label className="form-label">
                        <span>설명</span>
                        <textarea
                            ref={descRef}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="상품 설명을 입력하세요"
                            rows={5}
                        />
                    </label>
                </section>

                {/* 카드 3: 가격/협의 */}
                <section className="card">
                    <h3 className="card-title">가격</h3>

                    <div className={`price-row ${isShare ? 'disabled-section' : ''}`}>
                        <label className="form-label flex-1">
                            <span>가격 (원)</span>
                            <input
                                ref={priceRef}
                                type="text"
                                value={price ? price.toLocaleString() : ''}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, '');
                                    const num = Number(raw);
                                    setPrice(isNaN(num) ? 0 : num);
                                }}
                                placeholder="가격을 입력하세요"
                                disabled={isShare}
                            />
                        </label>

                        <div className="form-label">
                            <span>가격 제안</span>
                            <div className="seg-group tiny">
                                <button
                                    type="button"
                                    className={`seg-btn ${isNegotiable ? 'active' : ''}`}
                                    aria-pressed={isNegotiable}
                                    onClick={() => setIsNegotiable(true)}
                                    disabled={isShare}
                                >
                                    허용
                                </button>
                                <button
                                    type="button"
                                    className={`seg-btn ${!isNegotiable ? 'active' : ''}`}
                                    aria-pressed={!isNegotiable}
                                    onClick={() => setIsNegotiable(false)}
                                    disabled={isShare}
                                >
                                    미허용
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="price-buttons">
                        {[10000, 50000, 100000].map((val) => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => setPrice((prev) => (isShare ? 0 : prev + val))}
                                disabled={isShare}
                                className="chip-btn"
                                title={`+${val.toLocaleString()}원`}
                            >
                                +{val.toLocaleString()}원
                            </button>
                        ))}
                    </div>
                </section>

                {/* 카드 4: 분류 & 옵션들 */}
                <section className="card">
                    <h3 className="card-title">분류 & 옵션</h3>

                    {/* 카테고리만 select 유지 */}
                    <label className="form-label">
                        <span>카테고리</span>
                        <div ref={categoryRef}>
                            <CategoryDropdown
                                className="variant-underline size-sm"   // ← 느낌만 교체
                                items={categories}                 // [{ id, name }] 형태라고 가정
                                value={categoryId}
                                onChange={setCategoryId}
                                disabled={loadingCategories}
                                loading={loadingCategories}
                                placeholder="-- 선택 --"
                                ariaLabel="카테고리 선택"
                            />
                        </div>
                    </label>
                    {categoriesError && <p className="error-text" style={{ marginTop: 6 }}>{categoriesError}</p>}

                    {/* 거래 방식 버튼 */}
                    <div className="form-label">
                        <span>거래 방식</span>
                        <Segmented
                            ariaLabel="거래 방식"
                            value={tradeType}
                            onChange={setTradeType}
                            options={tradeTypeOptions}
                            disabled={loadingEnums}
                        />
                    </div>

                    {/* 상품 상태 버튼 */}
                    <div className="form-label">
                        <span>상품 상태</span>
                        <Segmented
                            ariaLabel="상품 상태"
                            value={condition}
                            onChange={setCondition}
                            options={conditionOptions}
                            disabled={loadingEnums}
                        />
                    </div>

                    {/* 판매 상태 버튼 */}
                    <div className="form-label">
                        <span>판매 상태</span>
                        <Segmented
                            ariaLabel="판매 상태"
                            value={status}
                            onChange={setStatus}
                            options={statusOptions}
                            disabled={loadingEnums}
                        />
                    </div>
                </section>

                {/* 카드 5: 제출 */}
                <section className="submit-card">
                    <button type="submit" className="btn primary big">수정하기</button>
                </section>
            </form>

            <ConfirmModal
                open={showConfirm}
                title="상품 정보를 수정할까요?"
                message="수정 내용을 저장합니다. 계속 진행하시겠어요?"
                confirmText="수정하기"
                cancelText="취소"
                danger={false}
                onConfirm={doSubmit}
                onCancel={() => setShowConfirm(false)}
            />
        </div>
    );
};

export default UpDateProductPage;
