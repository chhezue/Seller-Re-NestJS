// profile/components/EditProfileModal.tsx
import React, { useRef, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faPhone,
    faMapMarkerAlt,
    faIdBadge,
    faXmark,
    faLock,
    faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

import '../../auth/components/RegisterPage.css';
import useAuth, { RegionItem } from '../../auth/hooks/useAuth';
import type { Profile, UpdateProfilePayload } from '../hooks/useProfile';
import s from './EditProfileModal.module.css';
import RegionSelectModal from '../../../components/ui/RegionSelectModal';

type Props = {
    open: boolean;
    profile: Profile | null;
    onClose: () => void;
    onSaved?: (p: Profile) => void;
    onSave: (payload: UpdateProfilePayload) => Promise<Profile>;
    closeOnBackdrop?: boolean;
};

type UpdateProfilePayloadWithRegion = UpdateProfilePayload & { region_id?: string };

const EditProfileModal: React.FC<Props> = ({
    open,
    profile,
    onClose,
    onSaved,
    onSave,
    closeOnBackdrop = true,
}) => {
    const { getRegions, uploadTempUserImage } = useAuth();

    // 미리보기 URL (서버 URL 또는 blob URL)
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    /**
     * 이미지 변경 의도(3-상태):
     *  - undefined: 변경 없음(서버로 profileImageId를 보내지 않음)
     *  - string: 새 임시 업로드 파일 id → 교체
     *  - null: 기존 이미지 삭제
     */
    const [tempProfileImageId, setTempProfileImageId] = useState<string | null | undefined>(undefined);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(''); // 읽기전용
    const [phone, setPhone] = useState('');

    const [region, setRegion] = useState<{ city: string; district: string; dong: string }>({
        city: '',
        district: '',
        dong: '',
    });
    const [regionModalOpen, setRegionModalOpen] = useState(false);
    const [selectedRegionNode, setSelectedRegionNode] = useState<RegionItem | null>(null);
    const [regionLoading, setRegionLoading] = useState(false);

    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwError, setPwError] = useState<string>('');

    const [errors, setErrors] = useState<{ [k: string]: boolean }>({});

    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingPayload, setPendingPayload] = useState<UpdateProfilePayloadWithRegion | null>(null);
    const [changes, setChanges] = useState<
        Array<{ key: string; before?: string; after?: string; info?: string }>
    >([]);

    const [initialRegionFull, setInitialRegionFull] = useState<string>('');

    // ✅ 지역을 비우고 저장하려는 의도 플래그
    const [regionCleared, setRegionCleared] = useState(false);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // 초기값 세팅
    useEffect(() => {
        if (!open) return;

        setErrors({});
        setPwError('');
        setNewPw('');
        setConfirmPw('');
        setShowConfirm(false);
        setPendingPayload(null);
        setChanges([]);

        setUsername(profile?.username ?? '');
        setEmail(profile?.email ?? '');
        setPhone(profile?.phoneNumber ?? '');

        // 기존 프로필 이미지 URL을 미리보기로 세팅
        const imgUrl = profile?.profileImage || '';
        setPreviewImage(imgUrl || null);

        // 모달 열릴 때는 '변경 없음' 상태가 맞음
        setTempProfileImageId(undefined);

        setRegion({ city: '', district: '', dong: '' });
        setSelectedRegionNode(null);
        setInitialRegionFull('');
        setRegionCleared(false); // ✅ 초기화
    }, [open, profile]);

    // region tree 준비
    const getRegionsRef = useRef(getRegions);
    useEffect(() => {
        getRegionsRef.current = getRegions;
    }, [getRegions]);
    const regionListCacheRef = useRef<RegionItem[] | null>(null);
    const flattenRegionsTree = (list: RegionItem[]): RegionItem[] => {
        const flat: RegionItem[] = [];
        const stack: RegionItem[] = [...list];
        while (stack.length) {
            const node = stack.pop()!;
            flat.push({ id: node.id, name: node.name, parentId: node.parentId });
            if (node.children?.length) stack.push(...node.children);
        }
        return flat;
    };

    useEffect(() => {
        if (!open) return;

        const regionId = profile?.region?.id ?? profile?.region_id ?? null;
        the_const: {
            /* no-op label for clarity */
        }
        const districtNameFallback = profile?.region?.name ?? '';

        if (!regionId) {
            if (districtNameFallback) {
                setRegion({ city: '', district: districtNameFallback, dong: '' });
                setSelectedRegionNode(null);
                setInitialRegionFull(districtNameFallback);
            }
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                setRegionLoading(true);
                const raw = regionListCacheRef.current || (await getRegionsRef.current());
                if (cancelled) return;
                regionListCacheRef.current = raw;

                const flat = raw.some((n) => Array.isArray(n.children) && n.children.length)
                    ? flattenRegionsTree(raw)
                    : raw;

                const node = flat.find((n) => n.id === regionId) || null;
                if (!node) {
                    setRegion({ city: '', district: districtNameFallback, dong: '' });
                    setSelectedRegionNode(null);
                    setInitialRegionFull(districtNameFallback);
                    return;
                }

                const parentId = node.parentId ?? null;
                const parent = parentId ? flat.find((n) => n.id === parentId) : undefined;
                const cityName = parent?.name ?? '';

                setRegion({ city: cityName, district: node.name, dong: '' });
                setSelectedRegionNode(node);
                setInitialRegionFull(cityName ? `${cityName} ${node.name}` : node.name);
            } finally {
                if (!cancelled) setRegionLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, profile?.region?.id, profile?.region_id, profile?.region?.name, profile?.region?.parentId]);

    // 모달이 닫힐 때 blob URL 정리
    useEffect(() => {
        if (open) return;
        if (previewImage && previewImage.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const onBlur = (field: string, value: string) => {
        setErrors((prev) => ({ ...prev, [field]: !value.trim() }));
    };

    const handleProfileClick = () => fileInputRef.current?.click();

    // 파일 선택 → 즉시 임시 업로드(id 확보) + 로컬(blob) 미리보기 유지
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        // 1) 이전 blob 미리보기 정리
        if (previewImage && previewImage.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage);
        }

        // 2) 새 파일을 blob 미리보기로 표시 (서버 URL로 교체하지 않음)
        const blobUrl = URL.createObjectURL(file);
        setPreviewImage(blobUrl);

        // 3) 백그라운드로 임시 업로드(id만 확보)
        setUploadingAvatar(true);
        try {
            const { id /*, url*/ } = await uploadTempUserImage(file);
            // preview는 blob 유지
            setTempProfileImageId(id); // 교체 의도
        } catch (err) {
            console.error('[EditProfileModal] temp upload failed:', err);
            toast.error('이미지 업로드에 실패했어요.');
        } finally {
            setUploadingAvatar(false);
            if (e.target) e.target.value = ''; // 같은 파일 재선택 가능
        }
    };

    const handleDeleteProfileImage = () => {
        if (previewImage && previewImage.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage);
        }
        setPreviewImage(null);
        // 삭제 의도(null)
        setTempProfileImageId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const formatPhone = (v: string) => {
        const only = v.replace(/[^0-9]/g, '');
        if (only.length < 4) return only;
        if (only.length < 7) return `${only.slice(0, 3)}-${only.slice(3)}`;
        if (only.length < 11) return `${only.slice(0, 3)}-${only.slice(3, 6)}-${only.slice(6)}`;
        return `${only.slice(0, 3)}-${only.slice(3, 7)}-${only.slice(7, 11)}`;
    };

    const validatePasswordBlock = () => {
        const anyTyped = newPw || confirmPw;
        if (!anyTyped) {
            setPwError('');
            return true;
        }

        if (!newPw.trim()) {
            setPwError('새 비밀번호를 입력해주세요.');
            return false;
        }
        if (newPw.length < 8) {
            setPwError('새 비밀번호는 8자 이상이어야 합니다.');
            return false;
        }
        if (newPw !== confirmPw) {
            setPwError('새 비밀번호가 일치하지 않습니다.');
            return false;
        }
        setPwError('');
        return true;
    };

    const validatePhone = (v: string) => {
        const only = v.replace(/\D/g, '');
        return only.length === 11;
    };

    // 1단계: 변경내역 팝업
    const handleOpenConfirm = (e: React.FormEvent) => {
        e.preventDefault();

        const nextErrors: { [k: string]: boolean } = {
            nickname: !username.trim(),
            phone: !phone.trim() || !validatePhone(phone),
        };
        setErrors(nextErrors);
        if (nextErrors.phone) {
            toast.error('핸드폰 번호는 숫자 11자리여야 합니다.');
            return;
        }
        if (Object.values(nextErrors).some(Boolean)) {
            toast.error('입력값을 확인해 주세요.');
            return;
        }
        if (!validatePasswordBlock()) return;

        // 저장 페이로드(이미지는 profileImageId만 사용)
        const payload: UpdateProfilePayloadWithRegion = {
            username,
            phoneNumber: phone,
            ...(newPw ? { password: newPw } : {}),
        };

        // ✅ 지역 저장 규칙:
        // - 초기화 눌렀으면 region_id를 ''(빈 문자열)로 보내 '삭제' 의도 전달
        // - 아니면 선택된 region_id가 있을 때만 보냄 (없으면 미변경)
        if (regionCleared) {
            payload.region_id = '';
        } else if (selectedRegionNode?.id) {
            payload.region_id = selectedRegionNode.id;
        }

        // 이미지 변경 의도 반영
        if (typeof tempProfileImageId !== 'undefined') {
            payload.profileImageId = tempProfileImageId; // string(교체) | null(삭제)
        }

        setPendingPayload(payload);

        // 변경내역 표시
        const beforeRegion = initialRegionFull || profile?.region?.name || '';
        const afterRegion =
            regionCleared
                ? ''
                : (region.city && region.district ? `${region.city} ${region.district}` : region.district || '');

        const diff: Array<{ key: string; before?: string; after?: string; info?: string }> = [];
        if (profile?.username !== username)
            diff.push({ key: '닉네임', before: profile?.username || '-', after: username || '-' });
        if ((profile?.phoneNumber || '') !== (phone || ''))
            diff.push({ key: '연락처', before: profile?.phoneNumber || '-', after: phone || '-' });
        if ((beforeRegion || '') !== (afterRegion || ''))
            diff.push({ key: '지역', before: beforeRegion || '-', after: (afterRegion || '-') });
        if (newPw) diff.push({ key: '비밀번호', info: '새 비밀번호로 변경' });

        if (typeof tempProfileImageId !== 'undefined') {
            diff.push({ key: '프로필 이미지', info: tempProfileImageId === null ? '이미지 삭제' : '새 이미지로 변경' });
        }

        setChanges(diff);
        setShowConfirm(true);
    };

    const toFriendlyError = (err: any): string => {
        const raw = err?.message ?? err;
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (typeof parsed?.message === 'string') return parsed.message;
            if (Array.isArray(parsed?.message) && parsed.message.length) return parsed.message[0];
        } catch {}
        if (typeof raw === 'string') return raw;
        return '수정에 실패했습니다.';
    };

    const handleConfirmSave = async () => {
        if (!pendingPayload) return;
        try {
            const saved = await onSave(pendingPayload);
            // 저장 성공 후 서버가 준 최종 URL로 동기화(선택적이지만 권장)
            setPreviewImage(saved.profileImage || null);

            onSaved?.(saved);
            setShowConfirm(false);
            onClose();
        } catch (err: any) {
            const friendly = toFriendlyError(err);
            toast.error(friendly);
        }
    };

    const handleClearRegion = () => {
        setRegion({ city: '', district: '', dong: '' });
        setSelectedRegionNode(null);
        setRegionCleared(true); // ✅ 빈값으로 저장할 의도
    };

    return (
        <>
            {open && (
                <div className="region-backdrop" onClick={() => { if (closeOnBackdrop) onClose(); }}>
                    <div
                        className="region-dialog-popup"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-profile-title"
                    >
                        <div className="region-steps" style={{ justifyContent: 'space-between' }}>
                            <span id="edit-profile-title" style={{ fontWeight: 700 }}>프로필 수정</span>
                            <button type="button" className="btn ghost" aria-label="닫기" onClick={onClose} title="닫기">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>

                        <div className="register-container-popup" style={{ paddingTop: 0 }}>
                            <div className="register-box fade-in">
                                {/* 프로필 이미지 */}
                                <div className="profile-section">
                                    <div className="profile-wrapper">
                                        <div className="profile-circle" onClick={handleProfileClick}>
                                            {previewImage ? (
                                                <img src={previewImage} alt="미리보기" className="profile-preview" />
                                            ) : (
                                                <FontAwesomeIcon icon={faUser} className="profile-icon" />
                                            )}
                                        </div>

                                        {previewImage && (
                                            <div className="delete-button-wrapper">
                                                <button
                                                    type="button"
                                                    className="delete-image-icon"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteProfileImage(); }}
                                                    title="이미지 삭제"
                                                >
                                                    <FontAwesomeIcon icon={faXmark} />
                                                </button>
                                            </div>
                                        )}

                                        {uploadingAvatar && (
                                            <div className="uploading-chip" aria-live="polite">업로드 중…</div>
                                        )}
                                    </div>

                                    <p className="profile-label">프로필 이미지 변경</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                </div>

                                {/* 수정 폼 */}
                                <form className="form-list" onSubmit={handleOpenConfirm}>
                                    <div className="form-item">
                                        <FontAwesomeIcon icon={faIdBadge} className="input-icon" />
                                        <input
                                            type="text"
                                            name="nickname"
                                            placeholder="닉네임"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            onBlur={(e) => onBlur('nickname', e.target.value)}
                                            className={errors.nickname ? s.inputError : ''}
                                        />
                                    </div>

                                    <div className="form-item">
                                        <FontAwesomeIcon icon={faPhone} className="input-icon" />
                                        <input
                                            type="tel"
                                            name="phone"
                                            placeholder="핸드폰 번호 (숫자 11자리)"
                                            value={phone}
                                            onChange={(e) => setPhone(formatPhone(e.target.value))}
                                            onBlur={(e) => onBlur('phone', e.target.value)}
                                            className={`${errors.phone ? `${s.inputError} ${s.shakeOnError}` : ''}`}
                                        />
                                    </div>

                                    <div className="form-item address-search">
                                        <FontAwesomeIcon icon={faMapMarkerAlt} className="input-icon" />
                                        <div className="address-input-wrapper">
                                            <input
                                                type="text"
                                                className="address-input"
                                                placeholder="주소를 검색해주세요 (선택)"
                                                value={
                                                    regionLoading
                                                        ? '주소 불러오는 중...'
                                                        : regionCleared
                                                            ? ''
                                                            : (region.city && region.district
                                                                ? `${region.city} ${region.district}`
                                                                : (region.district || '')
                                                            )
                                                }
                                                readOnly
                                            />
                                            <button type="button" className="address-search-btn" onClick={() => setRegionModalOpen(true)}>
                                                주소 찾기
                                            </button>
                                            {(region.city || region.district || regionCleared) && (
                                                <button
                                                    type="button"
                                                    className={s.addressClearBtn}
                                                    onClick={handleClearRegion}
                                                    title="주소 초기화"
                                                >
                                                    <FontAwesomeIcon icon={faRotateLeft} />
                                                    초기화
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <h4 className="pw-title" style={{ marginTop: 12, marginBottom: 6 }}>
                                        비밀번호 변경 (선택)
                                    </h4>
                                    <div className="form-item">
                                        <FontAwesomeIcon icon={faLock} className="input-icon" />
                                        <input
                                            type="password"
                                            name="newPassword"
                                            placeholder="새 비밀번호 (8자 이상)"
                                            value={newPw}
                                            onChange={(e) => setNewPw(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-item">
                                        <FontAwesomeIcon icon={faLock} className="input-icon" />
                                        <input
                                            type="password"
                                            name="confirmNewPassword"
                                            placeholder="새 비밀번호 확인"
                                            value={confirmPw}
                                            onChange={(e) => setConfirmPw(e.target.value)}
                                        />
                                    </div>
                                    {pwError && <p className={s.errorText}>{pwError}</p>}

                                    {/* hidden (호환) */}
                                    <input type="hidden" name="region_city" value={region.city} />
                                    <input type="hidden" name="region_district" value={region.district} />
                                    <input type="hidden" name="region_dong" value={region.dong} />
                                    <input type="hidden" name="region_id" value={selectedRegionNode?.id ?? ''} />
                                    <input type="hidden" name="region_name" value={selectedRegionNode?.name ?? ''} />
                                    <input type="hidden" name="region_parent_id" value={selectedRegionNode?.parentId ?? ''} />

                                    <button type="submit" className="register-button" disabled={uploadingAvatar}>
                                        수정하기
                                    </button>
                                </form>
                            </div>
                        </div>

                        <RegionSelectModal
                            open={regionModalOpen}
                            onClose={() => setRegionModalOpen(false)}
                            onSelect={({ city, district }) => {
                                setRegion({
                                    city: city?.name ?? '',
                                    district: district?.name ?? '',
                                    dong: '',
                                });
                                setSelectedRegionNode(district);
                                setRegionCleared(false); // ✅ 선택 시 초기화 해제
                            }}
                        />
                    </div>

                    {/* 변경내역 확인 팝업 */}
                    {showConfirm && (
                        <div
                            className={s.confirmBackdrop}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowConfirm(false);
                            }}
                        >
                            <div className={s.confirmDialog} onClick={(e) => e.stopPropagation()}>
                                <h3 className={s.confirmTitle}>수정 내용을 저장할까요?</h3>
                                <p className={s.confirmText}>아래 변경 사항을 확인해 주세요.</p>

                                <div className={s.confirmList}>
                                    {changes.length === 0 ? (
                                        <div className={s.confirmRow}>
                                            <div className={s.confirmKey}>변경 사항</div>
                                            <div className={s.confirmVals}>
                                                <span className={s.badgeInfo}>변경된 항목이 없습니다</span>
                                            </div>
                                        </div>
                                    ) : (
                                        changes.map((c, i) => (
                                            <div key={i} className={s.confirmRow}>
                                                <div className={s.confirmKey}>{c.key}</div>
                                                <div className={s.confirmVals}>
                                                    {typeof c.before !== 'undefined' && (
                                                        <div className={s.diffBefore}>{c.before}</div>
                                                    )}
                                                    {typeof c.after !== 'undefined' && (
                                                        <div className={s.diffAfter}>{c.after}</div>
                                                    )}
                                                    {c.info && <span className={s.badgeInfo}>{c.info}</span>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className={s.confirmActions}>
                                    <button
                                        type="button"
                                        className={`btn ${s.ghost}`}
                                        onClick={() => setShowConfirm(false)}
                                    >
                                        취소
                                    </button>
                                    <button type="button" className="btn primary" onClick={handleConfirmSave}>
                                        저장
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default EditProfileModal;
