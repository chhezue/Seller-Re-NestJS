// profile/components/UserProfile.tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Profile } from '../hooks/useProfile';
import './UserProfile.css';

// ✅ 추가: 기본 아이콘 보여주기용
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

export interface UserProfileProps {
    profile: Profile | null;
    loading?: boolean;
    error?: string | null;
    onEdit?: () => void;
    onRefresh?: () => void;
}

const formatKST = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(d);
    const y = parts.find(p => p.type === 'year')?.value ?? '0000';
    const m = parts.find(p => p.type === 'month')?.value ?? '01';
    const day = parts.find(p => p.type === 'day')?.value ?? '01';
    return `${y}-${m}-${day}`;
};

const normalizePhone = (v?: string) => {
    if (!v) return '';
    const only = v.replace(/\D/g, '');
    if (only.length === 10) return only.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
    if (only.length === 11) return only.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    return v;
};

const shortId = (id?: string) => (id ? id.slice(0, 8) : '');

const UserProfile: React.FC<UserProfileProps> = ({
    profile,
    loading = false,
    error = null,
    onEdit,
    onRefresh,
}) => {
    const navigate = useNavigate();
    const [avatarFallback, setAvatarFallback] = useState(false);
    const [copied, setCopied] = useState(false);

    const regionName = profile?.region?.name || profile?.region_id || '';
    const created = useMemo(() => formatKST(profile?.createdAt), [profile?.createdAt]);
    const updated = useMemo(() => formatKST(profile?.updatedAt), [profile?.updatedAt]);
    const phone = useMemo(() => normalizePhone(profile?.phoneNumber), [profile?.phoneNumber]);

    if (loading) {
        return (
            <div className="profile-card skeleton" role="status" aria-live="polite">
                <div className="avatar-skel" />
                <div className="lines">
                    <div className="line w-60" />
                    <div className="line w-40" />
                    <div className="line w-80" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-error" role="alert">
                <p>프로필을 불러오는 중 오류가 발생했습니다.</p>
                <p className="detail">{error}</p>
                {onRefresh && (
                    <button type="button" className="btn" onClick={onRefresh}>다시 시도</button>
                )}
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="profile-empty">
                <p>프로필 정보가 없습니다.</p>
                {onRefresh && (
                    <button type="button" className="btn" onClick={onRefresh}>새로고침</button>
                )}
            </div>
        );
    }

    const role = profile.role;
    const status = profile.status;
    const pwFail = profile.passwordFailedCount;

    const copyId = async () => {
        try {
            await navigator.clipboard.writeText(profile.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // ignore
        }
    };

    const handleEditClick = () => {
        if (onEdit) {
            onEdit();
            return;
        }
        navigate('/profile/edit', { state: { from: '/profile' } });
    };

    // ✅ 이미지가 있고 로드 실패하지 않았을 때만 <img> 사용
    const hasImage = Boolean(profile.profileImage) && !avatarFallback;

    return (
        <div className="profile-wrap">
            <div className="profile-card v2">
                {/* 헤더 */}
                <div className="profile-top">
                    <div className="avatar-wrap">
                        {hasImage ? (
                            <img
                                className="avatar"
                                src={profile.profileImage!}
                                alt={`${profile.username}의 아바타`}
                                onError={() => { if (!avatarFallback) setAvatarFallback(true); }}
                            />
                        ) : (
                            // ✅ 기본 아이콘 렌더
                            <div className="avatar fallback" aria-label="기본 아바타">
                                <FontAwesomeIcon icon={faUser} className="profile-icon" />
                            </div>
                        )}
                        <div className="status-dot" data-status={(status || 'ACTIVE')!.toLowerCase()} />
                    </div>

                    <div className="primary">
                        <div className="name-row">
                            <h2 className="username">{profile.username}</h2>
                            {role && <span className="badge role">{role}</span>}
                            {status && <span className={`badge status ${status.toLowerCase()}`}>{status}</span>}
                        </div>
                        <div className="sub-row">
                            <span className="email">{profile.email}</span>
                            {phone && <span className="dot">•</span>}
                            {phone && <span className="phone">{phone}</span>}
                            {regionName && <><span className="dot">•</span><span className="region">{regionName}</span></>}
                        </div>
                    </div>
                </div>

                {/* 메타 그리드 */}
                <div className="meta-grid">
                    <div className="meta">
                        <span className="meta-label">가입일</span>
                        <span className="meta-value">{created || '-'}</span>
                    </div>
                    <div className="meta">
                        <span className="meta-label">최근 업데이트</span>
                        <span className="meta-value">{updated || '-'}</span>
                    </div>
                    <div className="meta">
                        <span className="meta-label">로그인 실패</span>
                        <span className="meta-value">{pwFail ?? 0}회</span>
                    </div>
                    <div className="meta id-cell">
                        <span className="meta-label">사용자 ID</span>
                        <div className="id-row">
                            <span className="meta-value mono">{shortId(profile.id)}</span>
                            <button type="button" className="chip" onClick={copyId}>
                                {copied ? '복사됨' : '복사'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 액션 */}
                <div className="profile-actions">
                    {onRefresh && (
                        <button type="button" className="btn ghost" onClick={onRefresh}>새로고침</button>
                    )}
                    <button type="button" className="btn primary" onClick={handleEditClick}>
                        프로필 수정
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
