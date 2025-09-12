// auth/components/RegisterForm.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser, faLock, faEnvelope, faPhone, faMapMarkerAlt, faIdBadge, faXmark, faRotateLeft
} from '@fortawesome/free-solid-svg-icons';
import './RegisterPage.css';
import useAuth, { RegionItem } from '../../auth/hooks/useAuth';
import RegionSelectModal from '../../../components/ui/RegionSelectModal';

interface RegionData {
    city: string;
    district: string;
    dong: string;
}

interface Props {
    region: RegionData;
    setRegion: (r: RegionData) => void;
    errors: { [key: string]: boolean };
    onBlur: (field: string, value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    password: string;
    setPassword: (val: string) => void;
    confirmPassword: string;
    setConfirmPassword: (val: string) => void;
    showMismatch: boolean;
    setShowMismatch: (val: boolean) => void;
    phone: string;
    setPhone: (val: string) => void;
}

const RegisterForm: React.FC<Props> = ({
    region, setRegion, errors, onBlur, onSubmit,
    password, setPassword, confirmPassword, setConfirmPassword,
    showMismatch, setShowMismatch,
    phone, setPhone
}) => {
    const { uploadTempUserImage } = useAuth();

    const [previewImage, setPreviewImage] = useState<string | null>(null); // blob 로컬 미리보기
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [tempImageId, setTempImageId] = useState<string>('');           // 제출용 id
    const [regionModalOpen, setRegionModalOpen] = useState(false);
    const [selectedRegionNode, setSelectedRegionNode] = useState<RegionItem | null>(null);
    const [pwTooShort, setPwTooShort] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (previewImage && previewImage.startsWith('blob:')) {
                URL.revokeObjectURL(previewImage);
            }
        };
    }, [previewImage]);

    const handleProfileClick = () => fileInputRef.current?.click();

    // 파일 선택 → 즉시 로컬 미리보기 + 임시 업로드
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        // 로컬 미리보기
        const localUrl = URL.createObjectURL(file);
        if (previewImage && previewImage.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage);
        }
        setPreviewImage(localUrl);

        // 임시 업로드
        setUploadingAvatar(true);
        try {
            const { id, url } = await uploadTempUserImage(file);
            console.log('[RegisterForm] temp upload ok:', { id, url });
            setTempImageId(id); // ✅ 회원가입 시 이 id를 전송
        } catch (err) {
            console.error('[RegisterForm] temp upload failed:', err);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleDeleteProfileImage = () => {
        if (previewImage && previewImage.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage);
        }
        setPreviewImage(null);
        setTempImageId('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRegionSelect = (path: { city: RegionItem; district: RegionItem }) => {
        const cityName = path.city?.name ?? '';
        const distName = path.district?.name ?? '';
        setRegion({ city: cityName, district: distName, dong: '' });
        setSelectedRegionNode(path.district ?? null);
    };

    // ✅ 주소 초기화
    const handleClearRegion = () => {
        setRegion({ city: '', district: '', dong: '' });
        setSelectedRegionNode(null);
    };

    const handleLocalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const tooShort = password.length < 8;
        const mismatch = password !== confirmPassword && confirmPassword !== '';
        setPwTooShort(tooShort);
        setShowMismatch(mismatch);
        if (tooShort || mismatch) return;
        onSubmit(e);
    };

    return (
        <div className="register-container">
            <div className="register-box fade-in">
                {/* 프로필 이미지 등록 */}
                <div className="profile-section">
                    <div className="profile-wrapper" onClick={handleProfileClick}>
                        <div className="profile-circle">
                            {previewImage ? (
                                <img src={previewImage} alt="미리보기" className="profile-preview" />
                            ) : (
                                <FontAwesomeIcon icon={faUser} className="profile-icon" />
                            )}
                        </div>

                        {previewImage && (
                            <div className="delete-button-wrapper" onClick={(e) => e.stopPropagation()}>
                                <button
                                    type="button"
                                    className="delete-image-icon"
                                    onClick={handleDeleteProfileImage}
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>
                        )}

                        {uploadingAvatar && (
                            <div className="uploading-chip" aria-live="polite">
                                업로드 중…
                            </div>
                        )}
                    </div>

                    <p className="profile-label">프로필 이미지 등록</p>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                </div>

                {/* 회원가입 폼 */}
                <form className="form-list" onSubmit={handleLocalSubmit}>
                    {/* 닉네임 */}
                    <div className="form-item">
                        <FontAwesomeIcon icon={faIdBadge} className="input-icon" />
                        <input
                            type="text"
                            name="nickname"
                            placeholder="닉네임"
                            onBlur={(e) => onBlur('nickname', e.target.value)}
                            className={errors.nickname ? 'input-error' : ''}
                        />
                    </div>
                    {errors.nickname && <p className="error-text">닉네임은 필수 입력입니다.</p>}

                    {/* 이메일 */}
                    <div className="form-item">
                        <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
                        <input
                            type="email"
                            name="email"
                            placeholder="이메일"
                            onBlur={(e) => onBlur('email', e.target.value)}
                            className={errors.email ? 'input-error' : ''}
                        />
                    </div>
                    {errors.email && <p className="error-text">이메일은 필수 입력입니다.</p>}

                    {/* 비밀번호 */}
                    <div className="form-item">
                        <FontAwesomeIcon icon={faLock} className="input-icon" />
                        <input
                            type="password"
                            name="password"
                            placeholder="비밀번호 (8자 이상)"
                            value={password}
                            minLength={8}
                            onChange={(e) => {
                                const v = e.target.value;
                                setPassword(v);
                                setPwTooShort(v.length < 8);
                                if (confirmPassword !== '') setShowMismatch(v !== confirmPassword);
                            }}
                            onBlur={(e) => {
                                onBlur('password', e.target.value);
                                setPwTooShort(e.target.value.length < 8);
                            }}
                            className={(errors.password || pwTooShort) ? 'input-error' : ''}
                            aria-invalid={pwTooShort}
                        />
                    </div>
                    {(errors.password || pwTooShort) && (
                        <p className="error-text">비밀번호는 8자 이상이어야 합니다.</p>
                    )}

                    {/* 비밀번호 확인 */}
                    <div className="form-item">
                        <FontAwesomeIcon icon={faLock} className="input-icon" />
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="비밀번호 확인"
                            value={confirmPassword}
                            onChange={(e) => {
                                const v = e.target.value;
                                setConfirmPassword(v);
                                setShowMismatch(password !== v && v !== '');
                            }}
                            onBlur={(e) => {
                                onBlur('confirmPassword', e.target.value);
                                setShowMismatch(password !== e.target.value && e.target.value !== '');
                            }}
                            className={(errors.confirmPassword || showMismatch) ? 'input-error' : ''}
                        />
                    </div>
                    {errors.confirmPassword && <p className="error-text">비밀번호 확인은 필수 입력입니다.</p>}
                    {showMismatch && <p className="error-text">비밀번호가 일치하지 않습니다.</p>}

                    {/* 전화번호 */}
                    <div className="form-item">
                        <FontAwesomeIcon icon={faPhone} className="input-icon" />
                        <input
                            type="tel"
                            name="phone"
                            placeholder="핸드폰 번호"
                            value={phone}
                            onChange={(e) => {
                                const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                                let formatted = onlyNums;
                                if (onlyNums.length < 4) formatted = onlyNums;
                                else if (onlyNums.length < 7) formatted = `${onlyNums.slice(0, 3)}-${onlyNums.slice(3)}`;
                                else if (onlyNums.length < 11) formatted = `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 6)}-${onlyNums.slice(6)}`;
                                else formatted = `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 7)}-${onlyNums.slice(7, 11)}`;
                                setPhone(formatted);
                            }}
                            onBlur={(e) => onBlur('phone', e.target.value)}
                            className={errors.phone ? 'input-error' : ''}
                        />
                    </div>
                    {errors.phone && <p className="error-text">핸드폰 번호는 필수 입력입니다.</p>}

                    {/* 주소 검색 (커스텀 모달) */}
                    <div className="form-item address-search">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="input-icon" />
                        <div className="address-input-wrapper">
                            <input
                                type="text"
                                className="address-input"
                                placeholder="주소를 검색해주세요"
                                value={
                                    region.city && region.district
                                        ? `${region.city} ${region.district}${region.dong ? ' ' + region.dong : ''}`
                                        : ''
                                }
                                readOnly
                            />
                            <button type="button" className="address-search-btn" onClick={() => setRegionModalOpen(true)}>
                                주소 찾기
                            </button>
                            {(region.city || region.district || region.dong) && (
                                <button
                                    type="button"
                                    className="address-clear-btn"
                                    onClick={handleClearRegion}
                                    title="주소 초기화"
                                >
                                    <FontAwesomeIcon icon={faRotateLeft} />
                                    초기화
                                </button>
                            )}
                        </div>
                    </div>

                    {/* hidden fields */}
                    <input type="hidden" name="region_city" value={region.city} />
                    <input type="hidden" name="region_district" value={region.district} />
                    <input type="hidden" name="region_dong" value={region.dong} />
                    <input type="hidden" name="region_id" value={selectedRegionNode?.id ?? ''} />
                    <input type="hidden" name="region_name" value={selectedRegionNode?.name ?? ''} />
                    <input type="hidden" name="region_parent_id" value={selectedRegionNode?.parentId ?? ''} />

                    {/* ✅ 제출용: 임시 업로드한 파일의 id */}
                    <input type="hidden" name="profileImageId" value={tempImageId} />

                    <button
                        type="submit"
                        className="register-button"
                        disabled={uploadingAvatar}
                        title={uploadingAvatar ? '이미지 업로드가 끝나면 완료할 수 있어요' : undefined}
                    >
                        가입하기
                    </button>
                </form>

                <p className="login-link">
                    이미 계정이 있으신가요? <Link to="/login">로그인</Link>
                </p>
            </div>

            <RegionSelectModal
                open={regionModalOpen}
                onClose={() => setRegionModalOpen(false)}
                onSelect={handleRegionSelect}
            />
        </div>
    );
};

export default RegisterForm;
