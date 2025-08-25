// features/products/components/ProductForm.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import CategoryDropdown from '../../products/routes/CategoryDropdown';
import { useProductEnums, useProductActions, useCategories } from '../../products/hooks/useProducts';
import '../../products/routes/NewProductPage.css';

type EnumOption = { key: string; label: string };

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

type ProductFormMode = 'create' | 'update';

type InitialData = Partial<ProductPayload> & {
    imageUrl?: string;          // 단일 대표 이미지 URL
    imageUrls?: string[];       // 다중 URL 있으면 우선 사용
};

const MAX_IMAGES = 8;

/* Segmented 작은 토글 버튼 */
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

/* 확인 모달 */
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

const ProductForm: React.FC<{
    mode: ProductFormMode;
    productId?: string;                 // update 모드에서 필요
    initial?: InitialData;              // update 모드에서 초기값으로 사용
}> = ({ mode, productId, initial }) => {
    const navigate = useNavigate();

    // 공통 훅
    const { createProduct, updateProduct } = useProductActions();
    const { statusOptions, tradeTypeOptions, conditionOptions, enumsError, loadingEnums } = useProductEnums();
    const { categories, loadingCategories, categoriesError } = useCategories();

    // 폼 상태
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [isNegotiable, setIsNegotiable] = useState(true);
    const [status, setStatus] = useState('ON_SALE');
    const [tradeType, setTradeType] = useState('SELL');
    const [condition, setCondition] = useState('USED');

    const [images, setImages] = useState<File[]>([]);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    // refs
    const imageInputRef = useRef<HTMLInputElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null);

    const isShare = tradeType === 'SHARE';

    // 초기값 세팅 (update일 때)
    useEffect(() => {
        if (!initial) return;

        setTitle(initial.name ?? '');
        setDescription(initial.description ?? '');
        setCategoryId(initial.categoryId ?? '');
        const priceVal = initial.tradeType === 'SHARE' ? 0 : (initial.price ?? 0);
        setPrice(priceVal);
        setIsNegotiable(initial.tradeType === 'SHARE' ? false : (initial.isNegotiable ?? true));
        setStatus(initial.status ?? 'ON_SALE');
        setTradeType(initial.tradeType ?? 'SELL');
        setCondition(initial.condition ?? 'USED');

        const preset = Array.isArray(initial.imageUrls) && initial.imageUrls.length > 0
            ? initial.imageUrls
            : (initial.imageUrl ? [initial.imageUrl] : []);
        setPreviewImages(preset);
    }, [initial]);

    // SHARE 자동 처리
    useEffect(() => {
        if (isShare) {
            setPrice(0);
            setIsNegotiable(false);
        }
    }, [isShare]);

    // 훅 에러
    useEffect(() => {
        if (enumsError) setErrorMessage(enumsError);
    }, [enumsError]);
    useEffect(() => {
        if (categoriesError) setErrorMessage(categoriesError);
    }, [categoriesError]);

    // 파일 추가
    const openFileDialog = () => imageInputRef.current?.click();

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fl = e.target.files;
        if (!fl || fl.length === 0) return;
        const newlySelected = Array.from(fl);

        // 중복 방지(이름+크기+수정시각)
        const keyOf = (f: File) => `${f.name}_${f.size}_${f.lastModified}`;
        const existingKeys = new Set(images.map(keyOf));
        const deduped = newlySelected.filter((f) => !existingKeys.has(keyOf(f)));

        // 최대 제한
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

    // 드래그 정렬
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [overIdx, setOverIdx] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDragIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index)); // Firefox
    };
    const handleDragEnter = (index: number) => { if (index !== dragIdx) setOverIdx(index); };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (index: number) => {
        if (dragIdx === null || dragIdx === index) { setDragIdx(null); setOverIdx(null); return; }
        const reorder = <T,>(arr: T[]) => {
            const next = arr.slice();
            const [moved] = next.splice(dragIdx, 1);
            next.splice(index, 0, moved);
            return next;
        };
        setImages((prev) => reorder(prev));
        setPreviewImages((prev) => reorder(prev));
        setDragIdx(null);
        setOverIdx(null);
    };
    const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

    // 포커스/스크롤
    const focusAndScroll = (el: Element | null) => {
        if (!el) return;
        const node = el as HTMLElement;
        node.focus?.();
        node.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    };
    const scrollErrorMessage = () => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 검증
    const validate = () => {
        if (!title) {
            setErrorMessage('상품명을 입력하세요.');
            focusAndScroll(titleRef.current);
            scrollErrorMessage();
            return false;
        }
        if (!isShare && (!price || price <= 0)) {
            setErrorMessage('가격을 입력하세요.');
            focusAndScroll(priceRef.current);
            scrollErrorMessage();
            return false;
        }
        if (!description) {
            setErrorMessage('설명을 입력하세요.');
            focusAndScroll(descRef.current);
            scrollErrorMessage();
            return false;
        }
        if (!categoryId) {
            setErrorMessage('카테고리를 선택하세요.');
            focusAndScroll(categoryRef.current);
            scrollErrorMessage();
            return false;
        }
        if (previewImages.length < 1) {
            setErrorMessage('이미지는 최소 1개 이상 등록하세요.');
            scrollErrorMessage();
            return false;
        }
        return true;
    };

    const payload: ProductPayload = useMemo(() => ({
        name: title,
        description,
        categoryId,
        price: isShare ? 0 : price,
        status,
        tradeType,
        condition,
        isNegotiable: isShare ? false : isNegotiable,
    }), [title, description, categoryId, isShare, price, status, tradeType, condition, isNegotiable]);

    const doSubmit = async () => {
        if (!validate()) { setShowConfirm(false); return; }

        try {
            if (mode === 'create') {
                const created = await createProduct(payload);
                toast.success('상품 등록 완료!');
                if (created?.id) navigate(`/item/${created.id}`); else navigate('/homepage');
            } else {
                if (!productId) {
                    toast.error('상품 ID가 없습니다.');
                    return;
                }
                const updated = await updateProduct(productId, payload);
                toast.success('상품 수정 성공!');
                navigate(`/item/${productId}`);
            }
        } catch (e: any) {
            if (e?.code === 'NOT_AUTHENTICATED') {
                toast.info('로그인이 필요합니다.');
                navigate('/login');
                return;
            }
            const msg = e?.message ?? (mode === 'create' ? '상품 등록에 실패했습니다.' : '상품 수정에 실패했습니다.');
            setErrorMessage(msg);
            scrollErrorMessage();
        } finally {
            setShowConfirm(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    return (
        <div className="new-product-center">
            <h2 className="page-title">
                <span className="page-title__text">
                    {mode === 'create' ? '상품 등록' : '상품 수정'}
                </span>
            </h2>

            {errorMessage && (
                <p ref={errorRef} className="error-message center">
                    {errorMessage}
                </p>
            )}

            <form className="cards" onSubmit={handleSubmit}>
                {/* 카드 1: 이미지 */}
                <section className="card">
                    <h3 className="card-title">{mode === 'create' ? '이미지 등록' : '이미지 수정'}</h3>

                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                    />

                    <div
                        className="dropzone"
                        role="button"
                        tabIndex={0}
                        onClick={openFileDialog}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openFileDialog(); }}
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
                                    <div
                                        key={idx}
                                        className={
                                            `thumb ${idx === 0 ? 'main' : ''} ` +
                                            `${dragIdx === idx ? 'dragging' : ''} ` +
                                            `${overIdx === idx && dragIdx !== idx ? 'drag-over' : ''}`
                                        }
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragEnter={() => handleDragEnter(idx)}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop(idx)}
                                        onDragEnd={handleDragEnd}
                                        onClick={(e) => e.stopPropagation()}
                                        title={idx === 0 ? '메인 이미지' : '드래그해서 순서 변경'}
                                    >
                                        {idx === 0 && <span className="main-badge">메인</span>}
                                        <img src={src} alt={`preview-${idx}`} />
                                        <button
                                            type="button"
                                            className="thumb-remove"
                                            aria-label="이미지 삭제"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                            title="이미지 삭제"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                {previewImages.length < MAX_IMAGES && (
                                    <button
                                        type="button"
                                        className="thumb add-more"
                                        onClick={(e) => { e.stopPropagation(); openFileDialog(); }}
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

                {/* 카드 4: 분류 & 옵션 */}
                <section className="card">
                    <h3 className="card-title">분류 & 옵션</h3>

                    <label className="form-label">
                        <span>카테고리</span>
                        <div ref={categoryRef}>
                            <CategoryDropdown
                                className="variant-underline size-sm"
                                items={categories}
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
                    <button type="submit" className="btn primary big">{mode === 'create' ? '등록하기' : '수정하기'}</button>
                    {mode === 'create' ? (
                        <p className="muted">(선택된 카테고리 ID: <strong>{categoryId || '없음'}</strong>)</p>
                    ) : null}
                </section>
            </form>

            <ConfirmModal
                open={showConfirm}
                title={mode === 'create' ? '상품을 등록할까요?' : '상품 정보를 수정할까요?'}
                message={mode === 'create' ? '입력한 내용으로 상품을 등록합니다.' : '수정 내용을 저장합니다.'}
                confirmText={mode === 'create' ? '등록하기' : '수정하기'}
                cancelText="취소"
                danger={false}
                onConfirm={doSubmit}
                onCancel={() => setShowConfirm(false)}
            />
        </div>
    );
};

export default ProductForm;
