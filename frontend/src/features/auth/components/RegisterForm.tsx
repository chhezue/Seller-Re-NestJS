import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser, faLock, faEnvelope, faPhone, faMapMarkerAlt, faIdBadge, faXmark
} from '@fortawesome/free-solid-svg-icons';
import './RegisterPage.css';

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: PostcodeData) => void;
      }) => { open: () => void };
    };
  }
}

interface PostcodeData {
  sido: string;
  sigungu: string;
  bname: string;
}

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

const RegisterForm: React.FC<Props> = ({
  region, setRegion, errors, onBlur, onSubmit,
  password, setPassword, confirmPassword, setConfirmPassword,
  showMismatch, setShowMismatch,
  phone, setPhone,
  profileImage, setProfileImage
}) => {
  const openPostcodePopup = () => {
    new window.daum.Postcode({
      oncomplete: (data: PostcodeData) => {
        const { sido, sigungu, bname } = data;
        if (sido && sigungu && bname) {
          setRegion({ city: sido, district: sigungu, dong: bname });
        }
      }
    }).open();
  };

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 상위에서 받은 profileImage 값으로 preview 초기화
  useEffect(() => {
    if (profileImage) {
      setPreviewImage(profileImage);
    } else {
      setPreviewImage(null);
    }
  }, [profileImage]);

  const handleProfileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewImage(base64);
        setProfileImage(base64);   // 부모 상태 업데이트
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteProfileImage = () => {
    setPreviewImage(null);
    setProfileImage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        <form className="form-list" onSubmit={onSubmit}>
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
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={(e) => onBlur('password', e.target.value)}
              className={errors.password ? 'input-error' : ''}
            />
          </div>
          {errors.password && <p className="error-text">비밀번호는 필수 입력입니다.</p>}

          {/* 비밀번호 확인 */}
          <div className="form-item">
            <FontAwesomeIcon icon={faLock} className="input-icon" />
            <input
              type="password"
              name="confirmPassword"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={(e) => {
                onBlur('confirmPassword', e.target.value);
                setShowMismatch(password !== e.target.value && e.target.value !== '');
              }}
              className={errors.confirmPassword || showMismatch ? 'input-error' : ''}
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

          {/* 주소 검색 */}
          <div className="form-item address-search">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="input-icon" />
            <div className="address-input-wrapper">
              <input
                type="text"
                className="address-input"
                placeholder="주소를 검색해주세요"
                value={
                  region.city && region.district && region.dong
                    ? `${region.city} ${region.district} ${region.dong}`
                    : ''
                }
                readOnly
              />
              <button type="button" className="address-search-btn" onClick={openPostcodePopup}>
                주소 찾기
              </button>
            </div>
          </div>

          {/* 히든 주소 값 */}
          <input type="hidden" name="region_city" value={region.city} />
          <input type="hidden" name="region_district" value={region.district} />
          <input type="hidden" name="region_dong" value={region.dong} />

          <button type="submit" className="register-button">가입하기</button>
        </form>

        <p className="login-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
