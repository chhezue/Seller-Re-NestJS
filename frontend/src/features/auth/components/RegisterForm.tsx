import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser, faLock, faEnvelope, faPhone, faMapMarkerAlt, faIdBadge, faXmark
} from '@fortawesome/free-solid-svg-icons';
import './RegisterPage.css';
import useAuth, { RegionItem } from '../../auth/hooks/useAuth';
import RegionSelectModal from '../../../components/ui/RegionSelectModal'; // ✅ 공용 모달 임포트

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
    profileImage: string;
    setProfileImage: (val: string) => void;
}

const API_BASE = 'http://127.0.0.1:3000';

const RegisterForm: React.FC<Props> = ({
    region, setRegion, errors, onBlur, onSubmit,
    password, setPassword, confirmPassword, setConfirmPassword,
    showMismatch, setShowMismatch,
    phone, setPhone,
    profileImage, setProfileImage
}) => {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 지역 모달
    const [regionModalOpen, setRegionModalOpen] = useState(false);

    // 숨은 필드로 내려줄 마지막 선택 노드(구 단위)
    const [selectedRegionNode, setSelectedRegionNode] = useState<RegionItem | null>(null);

    // ✅ 비밀번호 길이(8자) 검증 상태
    const [pwTooShort, setPwTooShort] = useState(false);

    useEffect(() => {
        setPreviewImage(profileImage || null);
    }, [profileImage]);

    const handleProfileClick = () => fileInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setPreviewImage(base64);
                setProfileImage(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteProfileImage = () => {
        setPreviewImage(null);
        setProfileImage('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ✅ 공용 RegionSelectModal(onSelect: { city, district })
    const handleRegionSelect = (path: { city: RegionItem; district: RegionItem }) => {
        const cityName = path.city?.name ?? '';
        const distName = path.district?.name ?? '';

        setRegion({
            city: cityName,
            district: distName,
            dong: '', // 공용 모달에서는 동 선택 없음
        });

        setSelectedRegionNode(path.district ?? null);
    };

    // ✅ 로컬 제출 핸들러: 8자 & 일치 검증 후 부모 onSubmit 호출
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const tooShort = password.length < 8;
        const mismatch = password !== confirmPassword && confirmPassword !== '';

        setPwTooShort(tooShort);
        setShowMismatch(mismatch);

        // 부모 쪽 다른 필드 에러는 부모가 관리(여기선 비번만 막음)
        if (tooShort || mismatch) return;

        onSubmit(e);
    };

    return (
        <div className="register-container">
            <div className="register-box fade-in">
                {/* 프로필 이미지 등록 */}
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProfileImage();
                                    }}
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
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
                <form className="form-list" onSubmit={handleSubmit}>
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
                                // 입력 중에도 일치 여부 갱신
                                if (confirmPassword !== '') {
                                    setShowMismatch(v !== confirmPassword);
                                }
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
                                if (onlyNums.length < 4) {
                                    formatted = onlyNums;
                                } else if (onlyNums.length < 7) {
                                    formatted = `${onlyNums.slice(0, 3)}-${onlyNums.slice(3)}`;
                                } else if (onlyNums.length < 11) {
                                    formatted = `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 6)}-${onlyNums.slice(6)}`;
                                } else {
                                    formatted = `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 7)}-${onlyNums.slice(7, 11)}`;
                                }
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
                        </div>
                    </div>

                    {/* hidden (표시/전송용) */}
                    <input type="hidden" name="region_city" value={region.city} />
                    <input type="hidden" name="region_district" value={region.district} />
                    <input type="hidden" name="region_dong" value={region.dong} />

                    <input type="hidden" name="region_id" value={selectedRegionNode?.id ?? ''} />
                    <input type="hidden" name="region_name" value={selectedRegionNode?.name ?? ''} />
                    <input type="hidden" name="region_parent_id" value={selectedRegionNode?.parentId ?? ''} />

                    <button type="submit" className="register-button">가입하기</button>
                </form>

                <p className="login-link">
                    이미 계정이 있으신가요? <Link to="/login">로그인</Link>
                </p>
            </div>

            {/* 지역 선택 모달(공용) */}
            <RegionSelectModal
                open={regionModalOpen}
                onClose={() => setRegionModalOpen(false)}
                onSelect={handleRegionSelect}
            />
        </div>
    );
};

export default RegisterForm;
