// features/products/components/ProductForm.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import CategoryDropdown from '../../products/routes/CategoryDropdown';
import { useProductEnums, useCategories } from '../../products/hooks/useProducts';
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
    imageUrl?: string;
    imageUrls?: string[];
    // ✅ 서버가 내려주는 상세의 images 배열을 그대로 받기 위함
    images?: Array<{
        fileId?: string;
        order?: number;
        isRepresentative?: boolean;
        file?: { id?: string; url?: string };
        url?: string;        // 백엔드 변형 대응
        tempUrl?: string;    // 백엔드 변형 대응
        path?: string;       // 백엔드 변형 대응
        id?: string;         // 백엔드 변형 대응
    }>;
};

const API_BASE = 'http://127.0.0.1:3000';
const MAX_IMAGES = 5;

const toAbsUrl = (u?: string) =>
    !u ? '' : /^https?:\/\//i.test(u) ? u : `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`;

type TempUpload = { id: string; tempUrl: string };
type TempImageState = {
    id: string;             // 서버 fileId (수정 제출 시 사용)
    previewUrl: string;     // 화면 표시용
    order: number;          // 순서 (0 = 대표)
    isNew: boolean;         // ✅ 새로 업로드된 파일인지 여부
    isRepresentative: boolean; // ✅ 대표 여부(상태로도 관리)
};

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
    productId?: string;
    initial?: InitialData;
}> = ({ mode, productId, initial }) => {
    const navigate = useNavigate();

    const { statusOptions, tradeTypeOptions, conditionOptions, enumsError, loadingEnums } = useProductEnums();
    const { categories, loadingCategories, categoriesError } = useCategories();

    const [title, setTitle] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [isNegotiable, setIsNegotiable] = useState(true);
    const [status, setStatus] = useState('ON_SALE');
    const [tradeType, setTradeType] = useState('SELL');
    const [condition, setCondition] = useState('USED');

    const [errorMessage, setErrorMessage] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    const [tempImages, setTempImages] = useState<TempImageState[]>([]);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [overIdx, setOverIdx] = useState<number | null>(null);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null);

    const isShare = tradeType === 'SHARE';

    /* =========================
     *   초기값 세팅 (update)
     * ========================= */
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

        // ✅ 1순위: 상세에서 내려온 images 배열
        if (Array.isArray(initial.images) && initial.images.length > 0) {
            const sorted = [...initial.images].sort((a, b) => {
                const ar = a?.isRepresentative ? -1 : 0;
                const br = b?.isRepresentative ? -1 : 0;
                if (ar !== br) return ar - br;
                const ao = a?.order ?? 0;
                const bo = b?.order ?? 0;
                return ao - bo;
            });

            const next: TempImageState[] = sorted.slice(0, MAX_IMAGES).map((it, i) => {
                const fileId = it?.fileId ?? it?.file?.id ?? it?.id ?? '';
                const url =
                    it?.file?.url ??
                    it?.url ??
                    it?.tempUrl ??
                    it?.path ??
                    initial.imageUrl ?? '';
                return {
                    id: fileId,                       // 기존 파일의 fileId
                    previewUrl: toAbsUrl(url),        // 절대 URL
                    order: i,                         // 정렬 반영
                    isNew: false,                     // ✅ 기존 이미지
                    isRepresentative: i === 0,        // 0번 대표
                };
            });

            setTempImages(next);
            return;
        }

        // ✅ 2순위(폴백): 기존 단일/다중 URL만 있을 때
        const urls: string[] =
            Array.isArray(initial.imageUrls) && initial.imageUrls.length > 0
                ? initial.imageUrls
                : (initial.imageUrl ? [initial.imageUrl] : []);

        if (urls.length) {
            const next = urls.slice(0, MAX_IMAGES).map((u, i) => ({
                id: '',                              // fileId 없음 → 제출 시 제외됨
                previewUrl: toAbsUrl(u),
                order: i,
                isNew: false,
                isRepresentative: i === 0,
            }));
            setTempImages(next);
        }
    }, [initial]);

    useEffect(() => {
        if (isShare) {
            setPrice(0);
            setIsNegotiable(false);
        }
    }, [isShare]);

    useEffect(() => {
        if (enumsError) setErrorMessage(enumsError);
    }, [enumsError]);
    useEffect(() => {
        if (categoriesError) setErrorMessage(categoriesError);
    }, [categoriesError]);

    /* =========================
     *   임시 업로드 API
     * ========================= */
    const uploadTempImages = async (files: File[]): Promise<TempUpload[]> => {
        const form = new FormData();
        files.forEach((f) => form.append('files', f, f.name));

        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch(`${API_BASE}/api/uploads/temp`, {
            method: 'POST',
            headers,
            body: form,
        });

        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            throw new Error(txt || `임시 업로드 실패 (${res.status})`);
        }

        const data = await res.json().catch(() => ({}));
        const items: any[] = Array.isArray(data)
            ? data
            : Array.isArray((data as any)?.items)
            ? (data as any).items
            : (data as any)?.id && (data as any)?.tempUrl
            ? [data as any]
            : [];

        return items.map((it) => {
            if (!it?.id || !it?.tempUrl) throw new Error('임시 업로드 응답 형식이 올바르지 않습니다.');
            return { id: it.id, tempUrl: it.tempUrl } as TempUpload;
        });
    };

    /* =========================
     *   이미지 업로드/관리
     * ========================= */
    const openFileDialog = () => imageInputRef.current?.click();

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fl = e.target.files;
        if (!fl || fl.length === 0) return;

        const remain = MAX_IMAGES - tempImages.length;
        if (remain <= 0) {
            toast.info(`이미지는 최대 ${MAX_IMAGES}장까지 등록할 수 있어요.`);
            e.target.value = '';
            return;
        }

        const files = Array.from(fl).slice(0, remain);

       // 1) 미리보기 먼저 추가 (Blob URL)
        const start = tempImages.length;
        const previews = files.map((file, i) => ({
            id: '',
            previewUrl: URL.createObjectURL(file),
            order: start + i,
            isNew: true,                 // ✅ 새 파일
            isRepresentative: false,
        }));
        setTempImages(prev => [...prev, ...previews]);

        // 2) 업로드해서 fileId 채우기
        try {
            const uploaded = await uploadTempImages(files); // [{ id, tempUrl }]
            setTempImages(prev => {
                const next = [...prev];
                for (let i = 0; i < uploaded.length; i++) {
                    const idx = start + i;
                    if (next[idx]) {
                        next[idx].id = uploaded[i].id;           // 서버 fileId
                        // 필요하면 미리보기 교체도 가능:
                        // next[idx].previewUrl = toAbsUrl(uploaded[i].tempUrl);
                    }
                }
                // 대표/순서 재계산
                return next.map((it, i) => ({ ...it, order: i, isRepresentative: i === 0 }));
            });
        } catch (err: any) {
            // 실패 시 방금 추가한 프리뷰 제거 + revoke
            setTempImages(prev => {
                const next = [...prev];
                for (let i = previews.length - 1; i >= 0; i--) {
                    const idx = start + i;
                    const removed = next[idx];
                    if (removed?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(removed.previewUrl);
                    next.splice(idx, 1);
                }
                return next.map((it, i) => ({ ...it, order: i, isRepresentative: i === 0 }));
            });
            toast.error(err?.message || '이미지 업로드 실패');
        } finally {
            e.target.value = '';
        }
    };

    const handleRemoveImage = (index: number) => {
        setTempImages(prev => {
            const next = prev.slice();
            const removed = next.splice(index, 1)[0];
            if (removed?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(removed.previewUrl);
            return next.map((it, i) => ({ ...it, order: i, isRepresentative: i === 0 }));
        });
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDragIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    };
    const handleDragEnter = (index: number) => {
        if (index !== dragIdx) setOverIdx(index);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    const handleDrop = (index: number) => {
        setTempImages(prev => {
            if (dragIdx === null || dragIdx === index) return prev;
            const next = prev.slice();
            const [moved] = next.splice(dragIdx, 1);
            next.splice(index, 0, moved);
            return next.map((it, i) => ({ ...it, order: i, isRepresentative: i === 0 })); // ✅ 대표/순서만 변경
        });
        setDragIdx(null);
        setOverIdx(null);
    };
    const handleDragEnd = () => {
        setDragIdx(null);
        setOverIdx(null);
    };

    const focusAndScroll = (el: Element | null) => {
        if (!el) return;
        const node = el as HTMLElement;
        node.focus?.();
        node.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    };
    const scrollErrorMessage = () => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
        if (tempImages.length < 1) {
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

    // 서버 스펙: images = [{ fileId, order, isRepresentative, ...(update면 isNew) }]
    const imagesPayload = tempImages
        .filter(im => im.id)                       // fileId 없는 항목 제외
        .sort((a, b) => a.order - b.order)
        .map((im, idx) => {
            const base = {
                fileId: im.id,
                order: idx,                        // 0부터 다시 매기기
                isRepresentative: idx === 0,
            } as any;

            // ✅ 수정(UPDATE)일 때만 isNew 포함 (새로 추가된 것만 true, 기존은 false)
            if (mode === 'update') {
                base.isNew = !!im.isNew;
            }
            return base;
        });

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                toast.info('로그인이 필요합니다.');
                navigate('/login');
                return;
            }

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            };

            if (mode === 'create') {
                const body = JSON.stringify({ ...payload, images: imagesPayload });
                const res = await fetch(`${API_BASE}/api/product`, {
                    method: 'POST',
                    headers,
                    body,
                });
                if (!res.ok) {
                    const txt = await res.text().catch(() => '');
                    throw new Error(txt || `상품 등록 실패 (${res.status})`);
                }
                const created = await res.json().catch(() => ({} as any));
                toast.success('상품 등록 완료!');
                if (created?.id) navigate(`/item/${created.id}`); else navigate('/homepage');
            } else {
                if (!productId) {
                    toast.error('상품 ID가 없습니다.');
                    return;
                }
                const body = JSON.stringify({ ...payload, images: imagesPayload });
                const res = await fetch(`${API_BASE}/api/product/${productId}`, {
                    method: 'PATCH',
                    headers,
                    body,
                });
                if (!res.ok) {
                    const txt = await res.text().catch(() => '');
                    throw new Error(txt || `상품 수정 실패 (${res.status})`);
                }
                await res.json().catch(() => ({}));
                toast.success('상품 수정 성공!');
                navigate(`/item/${productId}`);
            }
        } catch (e: any) {
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
                        aria-label={`이미지 추가: 최소 1개, 최대 ${MAX_IMAGES}개까지 가능`}
                    >
                        {tempImages.length === 0 ? (
                            <div className="dropzone-empty">
                                <div className="dropzone-plus">＋</div>
                                <div className="dropzone-text">이미지 추가</div>
                                <div className="dropzone-sub">최소 1개, 최대 {MAX_IMAGES}개까지 가능</div>
                            </div>
                        ) : (
                            <div className="preview-grid inside-dropzone">
                                {tempImages.map((img, idx) => (
                                    <div
                                        key={`${img.id || 'url'}-${idx}`}
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
                                        // 🔧 대표 안내 문구도 index 0 기준
                                        title={idx === 0 ? '대표 이미지' : '드래그해서 순서 변경'}
                                    >
                                        {/* 🔧 대표 배지: idx === 0 일 때만 */}
                                        {idx === 0 && <span className="main-badge">대표</span>}

                                        <img src={img.previewUrl} alt={`preview-${idx}`} />
                                        <div className="thumb-actions">
                                            {/* 🔧 “대표로” 버튼 제거 */}
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
                                    </div>
                                ))}
                                {tempImages.length < MAX_IMAGES && (
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
                        <div className="count-badge">{tempImages.length}/{MAX_IMAGES}</div>
                    </div>

                    <p className="help-text">최소 1개, 최대 {MAX_IMAGES}개까지 가능</p>
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
