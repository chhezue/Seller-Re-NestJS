// profile/components/UserProfile.tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Profile } from '../hooks/useProfile';
import './UserProfile.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

import EditProfileModal from './EditProfileModal';
import useProfile from '../hooks/useProfile';
import { useMySalesCount, useMyLikesCount } from '../../products/hooks/useProducts';
import { toast } from 'react-toastify';
import MannerTemp from '../../../components/ui/MannerTemp';

// ✅ 훅 임포트
import useAuth from '../../../features/auth/hooks/useAuth';

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
    onEdit, // eslint-disable-line @typescript-eslint/no-unused-vars
    onRefresh,
}) => {
    const navigate = useNavigate();

    // ✅ 모든 훅은 컴포넌트 상단에서 "항상" 호출
    const { logout } = useAuth();                 // ⬅⬅ 여기로 이동
    const { updateProfile } = useProfile();
    const { count: mySalesCount, loading: countLoading, error: countError } = useMySalesCount();
    const { count: myLikesCount, loading: likesLoading, error: likesError } = useMyLikesCount();

    const [avatarFallback, setAvatarFallback] = useState(false);
    const [copied, setCopied] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const regionName = profile?.region?.name || profile?.regionFullName || profile?.region_id || '';
    const created = useMemo(() => formatKST(profile?.createdAt), [profile?.createdAt]);
    const updated = useMemo(() => formatKST(profile?.updatedAt), [profile?.updatedAt]);
    const phone = useMemo(() => normalizePhone(profile?.phoneNumber), [profile?.phoneNumber]);

    const listings = (mySalesCount ?? profile?.listingsCount ?? 0);
    const favorites = (myLikesCount ?? profile?.favoritesCount ?? 0);
    const purchases = (profile as any)?.purchasesCount ?? 0;

    const ratingAvg = (profile as any)?.ratingAvg as number | undefined;
    const ratingCount = (profile as any)?.ratingCount as number | undefined;

    const profileImageUrl = useMemo(() => {
        const p: any = profile?.profileImage;
        if (!p) return '';
        if (typeof p === 'string') return p;
        return p.url || p.fileUrl || p.s3Url || '';
    }, [profile?.profileImage]);

    const hasImage = !!profileImageUrl && !avatarFallback;

    // ✅ 이제 아래의 조기 return과 관계없이 훅 순서는 고정됩니다.
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

    const copyId = async () => {
        try {
            await navigator.clipboard.writeText(profile.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // ignore
        }
    };

    const openEdit = () => setEditOpen(true);
    const goMySales = () => navigate('/my-sales');
    const goMyLikes = () => navigate('/my-likes');
    const comingSoon = (label: string) => toast.info(`${label}은(는) 준비 중입니다.`);

    const handleLogout = async () => {
        if (loggingOut) return;
        const ok = window.confirm('정말 로그아웃하시겠어요?');
        if (!ok) return;

        try {
            setLoggingOut(true);
            await logout();
            toast.success('로그아웃 되었습니다.');
            navigate('/login', { replace: true });
        } catch {
            toast.error('로그아웃 중 오류가 발생했습니다.');
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <>
            <div className="profile-wrap">
                <div className="profile-card v2">
                    {/* 헤더 */}
                    <div className="profile-top">
                        <div className="avatar-wrap">
                            {hasImage ? (
                                <img
                                    className="avatar"
                                    src={profileImageUrl}
                                    alt={`${profile.username}의 아바타`}
                                    onError={() => { if (!avatarFallback) setAvatarFallback(true); }}
                                />
                            ) : (
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
                                {regionName && (
                                    <>
                                        <span className="dot">•</span>
                                        <span className="region">{regionName}</span>
                                    </>
                                )}
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
                            <span className="meta-label">최근 수정일</span>
                            <span className="meta-value">{updated || '-'}</span>
                        </div>

                        {/* ✅ 매너온도 */}
                        <div className="meta">
                            <span className="meta-label">매너온도</span>
                            <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MannerTemp
                                    score5={typeof ratingAvg === 'number' ? ratingAvg : undefined}
                                    count={typeof ratingCount === 'number' ? ratingCount : undefined}
                                    className="size-sm manner-row--profile"
                                />
                            </div>
                        </div>

                        {/* 사용자 ID */}
                        <div className="meta id-cell">
                            <span className="meta-label">사용자 ID</span>
                            <div className="id-row">
                                <span className="meta-value mono">{shortId(profile.id)}</span>
                                <button type="button" className="chip" onClick={copyId}>
                                    {copied ? '복사됨' : '복사'}
                                </button>
                            </div>
                        </div>

                        {/* 내 판매 목록 */}
                        <div className="meta">
                            <span className="meta-label">내 판매 목록</span>
                            <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>{countLoading ? '집계 중…' : `${listings}개`}</span>
                                <button type="button" className="chip" onClick={goMySales}>
                                    보기
                                </button>
                            </div>
                            {countError && (
                                <div className="hint" style={{ color: '#b00020', fontSize: 12, marginTop: 4 }}>
                                    {countError}
                                </div>
                            )}
                        </div>

                        {/* 찜한 상품 */}
                        <div className="meta">
                            <span className="meta-label">찜한 상품</span>
                            <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>{likesLoading ? '집계 중…' : `${favorites}개`}</span>
                                <button type="button" className="chip" onClick={goMyLikes}>
                                    보기
                                </button>
                            </div>
                            {likesError && (
                                <div className="hint" style={{ color: '#b00020', fontSize: 12, marginTop: 4 }}>
                                    {likesError}
                                </div>
                            )}
                        </div>

                        {/* 구매내역 */}
                        <div className="meta">
                            <span className="meta-label">구매내역</span>
                            <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>{purchases}개</span>
                                <button type="button" className="chip" onClick={() => toast.info('구매내역은(는) 준비 중입니다.')}>
                                    보기
                                </button>
                            </div>
                        </div>

                        {/* 리뷰내역 */}
                        <div className="meta">
                            <span className="meta-label">리뷰내역</span>
                            <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>{purchases}개</span>
                                <button type="button" className="chip" onClick={() => toast.info('리뷰내역은(는) 준비 중입니다.')}>
                                    보기
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 액션 */}
                    <div className="profile-actions">
                        <button type="button" className="btn primary" onClick={() => setEditOpen(true)}>
                            프로필 수정
                        </button>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="logout-btn"
                            disabled={loggingOut}
                            aria-busy={loggingOut}
                        >
                            {loggingOut ? '로그아웃 중…' : '로그아웃'}
                        </button>
                    </div>
                </div>
            </div>

            {editOpen && (
                <EditProfileModal
                    open={editOpen}
                    profile={profile}
                    onClose={() => setEditOpen(false)}
                    onSave={updateProfile}
                    onSaved={() => {
                        setEditOpen(false);
                        onRefresh?.();
                        toast.success('프로필이 수정되었습니다. 🎉');
                    }}
                    closeOnBackdrop={false}
                />
            )}
        </>
    );
};

export default UserProfile;
