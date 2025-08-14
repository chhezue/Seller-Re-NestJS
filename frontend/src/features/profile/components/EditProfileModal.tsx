// profile/components/EditProfileModal.tsx
import React, { useRef, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser, faEnvelope, faPhone, faMapMarkerAlt, faIdBadge, faXmark, faLock
} from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

// 백엔드 요구사항: region_id(구/군 id) + (비밀번호 변경 시) currentPassword 도 함께 전달
type UpdateProfilePayloadWithRegion = UpdateProfilePayload & { region_id?: string };

const EditProfileModal: React.FC<Props> = ({
    open,
    profile,
    onClose,
    onSaved,
    onSave,
    closeOnBackdrop = true,
}) => {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 폼 상태
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(''); // 읽기전용
    const [phone, setPhone] = useState('');

    // 주소 표시 & 선택
    const [region, setRegion] = useState<{ city: string; district: string; dong: string }>({ city: '', district: '', dong: '' });
    const [regionModalOpen, setRegionModalOpen] = useState(false);
    const [selectedRegionNode, setSelectedRegionNode] = useState<RegionItem | null>(null);
    const [regionLoading, setRegionLoading] = useState(false);

    // 비밀번호(선택)
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwError, setPwError] = useState<string>('');

    // 유효성
    const [errors, setErrors] = useState<{ [k: string]: boolean }>({});

    // 변경내역 확인 팝업
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingPayload, setPendingPayload] = useState<UpdateProfilePayloadWithRegion | null>(null);
    const [changes, setChanges] = useState<Array<{ key: string; before?: string; after?: string; info?: string }>>([]);

    // 풀 네임 비교용 초기 지역 풀네임
    const [initialRegionFull, setInitialRegionFull] = useState<string>('');

    // ESC 닫기
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // 초기값 세팅
    useEffect(() => {
        if (!open) return;

        setErrors({});
        setPwError('');
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        setShowConfirm(false);
        setPendingPayload(null);
        setChanges([]);

        setUsername(profile?.username ?? '');
        setEmail(profile?.email ?? '');
        setPhone(profile?.phoneNumber ?? '');

        const img = profile?.profileImage || '';
        setPreviewImage(img || null);

        setRegion({ city: '', district: '', dong: '' });
        setSelectedRegionNode(null);
        setInitialRegionFull('');
    }, [open, profile]);

    // 초기 표시용: 시/도 + 구/군 풀네임 구성
    const { getRegions } = useAuth();
    const getRegionsRef = useRef(getRegions);
    useEffect(() => { getRegionsRef.current = getRegions; }, [getRegions]);
    const regionListCacheRef = useRef<RegionItem[] | null>(null);

    // 트리(children)를 평면으로 펼치기
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

                const raw = regionListCacheRef.current || await getRegionsRef.current();
                if (cancelled) return;
                regionListCacheRef.current = raw;

                const flat = raw.some(n => Array.isArray(n.children) && n.children.length)
                    ? flattenRegionsTree(raw)
                    : raw;

                const node = flat.find(n => n.id === regionId) || null;

                if (!node) {
                    setRegion({ city: '', district: districtNameFallback, dong: '' });
                    setSelectedRegionNode(null);
                    setInitialRegionFull(districtNameFallback);
                    return;
                }

                const parentId = node.parentId ?? null;
                const parent = parentId ? flat.find(n => n.id === parentId) : undefined;
                const cityName = parent?.name ?? '';

                setRegion({ city: cityName, district: node.name, dong: '' });
                setSelectedRegionNode(node);
                setInitialRegionFull(cityName ? `${cityName} ${node.name}` : node.name);
            } catch {
                const dn = districtNameFallback;
                setRegion({ city: '', district: dn, dong: '' });
                setSelectedRegionNode(null);
                setInitialRegionFull(dn);
            } finally {
                if (!cancelled) setRegionLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [
        open,
        profile?.region?.id,
        profile?.region_id,
        profile?.region?.name,
        profile?.region?.parentId,
    ]);

    const onBlur = (field: string, value: string) => {
        setErrors((prev) => ({ ...prev, [field]: !value.trim() }));
    };

    const handleProfileClick = () => fileInputRef.current?.click();
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setPreviewImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    const handleDeleteProfileImage = () => {
        setPreviewImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const formatPhone = (v: string) => {
        const only = v.replace(/[^0-9]/g, '');
        if (only.length < 4) return only;
        if (only.length < 7) return `${only.slice(0, 3)}-${only.slice(3)}`;
        if (only.length < 11) return `${only.slice(0, 3)}-${only.slice(3, 6)}-${only.slice(6)}`;
        return `${only.slice(0, 3)}-${only.slice(3, 7)}-${only.slice(7, 11)}`;
    };

    const handleRegionSelect = (path: { city: RegionItem; district: RegionItem }) => {
        setRegion({ city: path.city?.name ?? '', district: path.district?.name ?? '', dong: '' });
        setSelectedRegionNode(path.district ?? null);
        setErrors(prev => ({ ...prev, region: false }));
        setRegionLoading(false);
    };

    // 비밀번호 검증: 변경하려면 currentPw + (newPw/confirmPw 일치, 8자 이상)
    const validatePasswordBlock = () => {
        const anyTyped = currentPw || newPw || confirmPw;
        if (!anyTyped) { setPwError(''); return true; }

        if (!currentPw.trim()) {
            setPwError('현재 비밀번호를 입력해주세요.');
            return false;
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

    // 휴대폰 11자리 숫자 검사
    const validatePhone = (v: string) => {
        const only = v.replace(/\D/g, '');
        return only.length === 11;
    };

    // 1단계: 변경내역 팝업 띄우기
    const handleOpenConfirm = (e: React.FormEvent) => {
        e.preventDefault();

        const regionId = selectedRegionNode?.id || profile?.region?.id || profile?.region_id || '';

        const nextErrors: { [k: string]: boolean } = {
            nickname: !username.trim(),
            phone: !phone.trim() || !validatePhone(phone), // ✅ 11자리 체크
            region: !regionId,
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

        // region_id(=구/군 id) + (비번변경시) currentPassword 포함
        const payload: UpdateProfilePayloadWithRegion = {
            username,
            email: profile?.email ?? '',
            phoneNumber: phone,
            profileImage: previewImage ?? '',
            region_id: regionId,
            ...(newPw ? { password: newPw } : {}),
            ...(newPw ? { currentPassword: currentPw } : {}),
        };

        // 변경내역 산출
        const beforeRegion = initialRegionFull || profile?.region?.name || '';
        const afterRegion = region.city && region.district ? `${region.city} ${region.district}` : (region.district || '');

        const diff: Array<{ key: string; before?: string; after?: string; info?: string }> = [];
        if (profile?.username !== username) diff.push({ key: '닉네임', before: profile?.username || '-', after: username || '-' });
        if ((profile?.phoneNumber || '') !== (phone || '')) diff.push({ key: '연락처', before: profile?.phoneNumber || '-', after: phone || '-' });
        if ((beforeRegion || '') !== (afterRegion || '')) diff.push({ key: '지역', before: beforeRegion || '-', after: afterRegion || '-' });
        if (newPw) diff.push({ key: '비밀번호', info: '새 비밀번호로 변경' });
        if ((profile?.profileImage || '') !== (previewImage || '')) diff.push({ key: '프로필 이미지', info: '이미지 변경' });

        console.log('[EditProfileModal] pending payload (before confirm):', payload);

        setPendingPayload(payload);
        setChanges(diff);
        setShowConfirm(true);
    };

    // 백엔드 에러 메시지 → 사용자 친화적 문구로 매핑
    const toFriendlyError = (err: any): string => {
        const raw = err?.message ?? err;
        // JSON 문자열일 수 있음
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const msgs: string[] = Array.isArray(parsed?.message) ? parsed.message : [];
            if (
                msgs.some((m) =>
                    /property\s+password\s+should\s+not\s+exist/i.test(m) ||
                    /property\s+currentPassword\s+should\s+not\s+exist/i.test(m)
                )
            ) {
                return '현재 비밀번호가 틀렸습니다.';
            }
            if (typeof parsed?.message === 'string' && /invalid current password/i.test(parsed.message)) {
                return '현재 비밀번호가 틀렸습니다.';
            }
        } catch {
            // noop
        }
        // 문자열 안에 직접 포함된 경우
        if (typeof raw === 'string') {
            if (/currentPassword/i.test(raw) && /should not exist/i.test(raw)) return '현재 비밀번호가 틀렸습니다.';
            if (/invalid current password/i.test(raw)) return '현재 비밀번호가 틀렸습니다.';
        }
        return err?.message ?? '수정에 실패했습니다.';
    };

    // 2단계: 최종 저장
    const handleConfirmSave = async () => {
        if (!pendingPayload) return;
        try {
            console.log('[EditProfileModal] submit payload to onSave:', pendingPayload);

            const saved = await onSave(pendingPayload);

            onSaved?.(saved);
            setShowConfirm(false);
            // ✅ 먼저 토스트 보여주고
            toast.success('회원 정보가 수정되었습니다.');
            // ✅ 모달 닫기 (ToastContainer는 계속 렌더되므로 사라지지 않음)
            onClose();
        } catch (err: any) {
            const friendly = toFriendlyError(err);
            if (/현재 비밀번호/.test(friendly)) {
                setPwError(friendly); // 입력 박스 아래에도 노출
            }
            toast.error(friendly);
        }
    };

    return (
        <>
            {/* ✅ 항상 렌더: 모달이 닫혀도 토스트 유지 */}
            <ToastContainer position="top-center" autoClose={1800} hideProgressBar />

            {open && (
                <div
                    className="region-backdrop"
                    onClick={() => { if (closeOnBackdrop) onClose(); }}
                >
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
                                    {/* 닉네임 */}
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
                                    {errors.nickname && <p className={s.errorText}>닉네임은 필수 입력입니다.</p>}

                                    {/* 전화번호 */}
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

                                    {/* 주소 */}
                                    <div className="form-item address-search">
                                        <FontAwesomeIcon icon={faMapMarkerAlt} className="input-icon" />
                                        <div className="address-input-wrapper">
                                            <input
                                                type="text"
                                                className={`address-input ${errors.region ? s.inputError : ''}`}
                                                placeholder="주소를 검색해주세요"
                                                value={regionLoading ? '주소 불러오는 중...' :
                                                    (region.city && region.district ? `${region.city} ${region.district}` : (region.district || ''))}
                                                readOnly
                                            />
                                            <button type="button" className="address-search-btn" onClick={() => setRegionModalOpen(true)}>
                                                주소 찾기
                                            </button>
                                        </div>
                                    </div>
                                    {errors.region && <p className={s.errorText}>주소(시/도, 구/군)를 선택해 주세요.</p>} 

                                    {/* 비밀번호 변경(선택) */}
                                    <h4 className="pw-title" style={{ marginTop: 12, marginBottom: 6 }}>비밀번호 변경 (선택)</h4>

                                    {/* 현재 비밀번호 */}
                                    <div className="form-item">
                                        <FontAwesomeIcon icon={faLock} className="input-icon" />
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            placeholder="현재 비밀번호"
                                            value={currentPw}
                                            onChange={(e) => setCurrentPw(e.target.value)}
                                        />
                                    </div>

                                    {/* 새 비밀번호 */}
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

                                    {/* 새 비밀번호 확인 */}
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

                                    <button type="submit" className="register-button">수정하기</button>
                                </form>
                            </div>
                        </div>

                        {/* 지역 선택 모달 */}
                        <RegionSelectModal
                            open={regionModalOpen}
                            onClose={() => setRegionModalOpen(false)}
                            onSelect={({ city, district }) => {
                                setRegion({ city: city?.name ?? '', district: district?.name ?? '', dong: '' });
                                setSelectedRegionNode(district);
                            }}
                        />
                    </div>

                    {/* 변경내역 확인 팝업 */}
                    {showConfirm && (
                        <div className={s.confirmBackdrop} onClick={() => setShowConfirm(false)}>
                            <div className={s.confirmDialog} onClick={(e) => e.stopPropagation()}>
                                <h3 className={s.confirmTitle}>수정 내용을 저장할까요?</h3>
                                <p className={s.confirmText}>아래 변경 사항을 확인해 주세요.</p>

                                <div className={s.confirmList}>
                                    {changes.length === 0 ? (
                                        <div className={s.confirmRow}>
                                            <div className={s.confirmKey}>변경 사항</div>
                                            <div className={s.confirmVals}><span className={s.badgeInfo}>변경된 항목이 없습니다</span></div>
                                        </div>
                                    ) : (
                                        changes.map((c, i) => (
                                            <div key={i} className={s.confirmRow}>
                                                <div className={s.confirmKey}>{c.key}</div>
                                                <div className={s.confirmVals}>
                                                    {typeof c.before !== 'undefined' && <div className={s.diffBefore}>{c.before}</div>}
                                                    {typeof c.after !== 'undefined' && <div className={s.diffAfter}>{c.after}</div>}
                                                    {c.info && <span className={s.badgeInfo}>{c.info}</span>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className={s.confirmActions}>
                                    <button type="button" className={`btn ${s.ghost}`} onClick={() => setShowConfirm(false)}>취소</button>
                                    <button type="button" className="btn primary" onClick={handleConfirmSave}>저장</button>
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
