// features/products/routes/NewProductPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './NewProductPage.css';
import CategoryDropdown from '../routes/CategoryDropdown';
import { useProductEnums, useProductActions, useCategories } from '../hooks/useProducts';

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

const NewProductPage: React.FC = () => {
    const navigate = useNavigate();
    const { createProduct } = useProductActions();
    const {
        statusOptions,
        tradeTypeOptions,
        conditionOptions,
        enumsError,
        loadingEnums
    } = useProductEnums();

    // ✅ 카테고리 API에서 로딩
    const { categories, loadingCategories, categoriesError } = useCategories();

    const [title, setTitle] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState('');

    const [categoryId, setCategoryId] = useState('');
    const [isNegotiable, setIsNegotiable] = useState(true);
    const [status, setStatus] = useState('ON_SALE');
    const [tradeType, setTradeType] = useState('SELL');
    const [condition, setCondition] = useState('USED');

    const [showConfirm, setShowConfirm] = useState(false);

    // 포커스/스크롤 refs
    const titleRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);
    const categoryRef = useRef<HTMLSelectElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null);

    // 파일 입력 트리거 ref
    const imageInputRef = useRef<HTMLInputElement>(null);

    const isShare = tradeType === 'SHARE';

    useEffect(() => {
        if (enumsError) setErrorMessage(enumsError);
    }, [enumsError]);

    useEffect(() => {
        if (categoriesError) setErrorMessage(categoriesError);
    }, [categoriesError]);

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

        // 중복 방지용 키 (이름+크기+수정시각)
        const keyOf = (f: File) => `${f.name}_${f.size}_${f.lastModified}`;
        const existingKeys = new Set(images.map(keyOf));

        // 중복 제거
        const deduped = newlySelected.filter((f) => !existingKeys.has(keyOf(f)));

        // 최대 8장 제한
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
        const nextPreviews = [
            ...previewImages,
            ...toAdd.map((f) => URL.createObjectURL(f))
        ];

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
            if (removedUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(removedUrl);
            }
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

    const doSubmit = async () => {
        // 필수값 검증 + 포커스/스크롤
        if (!title) {
            setErrorMessage('상품명을 입력하세요.');
            focusAndScroll(titleRef.current);
            scrollErrorMessage();
            setShowConfirm(false);
            return;
        }
        if (!isShare && price <= 0) {
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
        if (previewImages.length < 1) {
            setErrorMessage('이미지는 최소 1개 이상 등록하세요.');
            scrollErrorMessage();
            setShowConfirm(false);
            return;
        }

        const payload = {
            name: title,
            description,
            categoryId,
            price: isShare ? 0 : price,
            status,
            tradeType,
            condition,
            isNegotiable: isShare ? false : isNegotiable,
        };

        try {
            const created = await createProduct(payload);
            toast.success('상품 등록 완료!');
            if (created?.id) {
                navigate(`/item/${created.id}`);
            } else {
                navigate('/homepage');
            }
        } catch (e: any) {
            if (e?.code === 'NOT_AUTHENTICATED') {
                toast.info('로그인이 필요합니다.');
                navigate('/login');
                return;
            }
            setErrorMessage(e?.message ?? '상품 등록에 실패했습니다.');
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
            <h2 className="page-title">상품 등록</h2>

            {errorMessage && (
                <p ref={errorRef} className="error-message center">
                    {errorMessage}
                </p>
            )}

            <form className="cards" onSubmit={handleSubmit}>
                {/* 카드 1: 이미지 */}
                <section className="card">
                    <h3 className="card-title">이미지 등록</h3>

                    {/* 숨긴 파일 입력 */}
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                    />

                    {/* 드롭존 (보더라인) */}
                    <div
                        className="dropzone"
                        role="button"
                        tabIndex={0}
                        onClick={openFileDialog}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') openFileDialog();
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
                                            openFileDialog();
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

                {/* 카드 4: 분류 & 선택 옵션들 */}
                <section className="card">
                    <h3 className="card-title">분류 & 옵션</h3>

                    {/* 카테고리만 select 유지 */}
                    <label className="form-label">
                        <span>카테고리</span>
                        <CategoryDropdown
                            className="variant-underline size-sm"   // ← 느낌만 교체
                            items={categories}                 // [{ id, name }]
                            value={categoryId}                 // 현재 선택된 id
                            onChange={setCategoryId}           // id 반환
                            disabled={loadingCategories}
                            loading={loadingCategories}
                            placeholder="-- 선택 --"
                            ariaLabel="카테고리 선택"
                        />
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
                    <button type="submit" className="btn primary big">등록하기</button>
                    <p className="muted">
                        (선택된 카테고리 ID: <strong>{categoryId || '없음'}</strong>)
                    </p>
                </section>
            </form>

            <ConfirmModal
                open={showConfirm}
                title="상품을 등록할까요?"
                message="입력한 내용으로 상품을 등록합니다. 계속 진행하시겠어요?"
                confirmText="등록하기"
                cancelText="취소"
                danger={false}
                onConfirm={doSubmit}
                onCancel={() => setShowConfirm(false)}
            />
        </div>
    );
};

export default NewProductPage;
