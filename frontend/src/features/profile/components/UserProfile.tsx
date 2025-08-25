// profile/components/UserProfile.tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Profile } from '../hooks/useProfile';
import './UserProfile.css';

// 아이콘
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

// 모달 & 업데이트 훅
import EditProfileModal from './EditProfileModal';
import useProfile from '../hooks/useProfile';
import { useMySalesCount } from '../../products/hooks/useProducts';
import { toast } from 'react-toastify';

// ✅ 매너온도 컴포넌트 추가
import MannerTemp from '../../../components/ui/MannerTemp';

export interface UserProfileProps {
    profile: Profile | null;
    loading?: boolean;
    error?: string | null;
    onEdit?: () => void;      // (호환용) 이제는 사용하지 않음 — 모달을 바로 띄움
    onRefresh?: () => void;   // 저장 후 목록 갱신용
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
    onEdit,          // eslint-disable-line @typescript-eslint/no-unused-vars
    onRefresh,
}) => {
    const navigate = useNavigate();
    const [avatarFallback, setAvatarFallback] = useState(false);
    const [copied, setCopied] = useState(false);

    // 모달 열기 상태
    const [editOpen, setEditOpen] = useState(false);

    // 프로필 업데이트 훅 (onSave에 전달)
    const { updateProfile } = useProfile();

    // 내 판매 목록 수
    const { count: mySalesCount, loading: countLoading, error: countError } = useMySalesCount();

    const regionName = profile?.region?.name || profile?.regionFullName || profile?.region_id || '';
    const created = useMemo(() => formatKST(profile?.createdAt), [profile?.createdAt]);
    const updated = useMemo(() => formatKST(profile?.updatedAt), [profile?.updatedAt]);
    const phone = useMemo(() => normalizePhone(profile?.phoneNumber), [profile?.phoneNumber]);

    // 서버가 주는 값 있으면 사용, 없으면 0/placeholder
    const listings = (mySalesCount ?? profile?.listingsCount ?? 0);
    const favorites = profile?.favoritesCount ?? 0;
    const purchases = (profile as any)?.purchasesCount ?? 0;

    // ⭐ 별점 → 매너온도 컴포넌트에 전달
    const ratingAvg = (profile as any)?.ratingAvg as number | undefined;
    const ratingCount = (profile as any)?.ratingCount as number | undefined;

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

    // 라우팅 없이 바로 모달 오픈
    const openEdit = () => setEditOpen(true);

    // 내 판매 목록 보기
    const goMySales = () => {
        navigate('/homepage?myOnly=1');
    };

    // 아직 준비중 버튼 공통 핸들러
    const comingSoon = (label: string) => {
        toast.info(`${label}은(는) 준비 중입니다.`);
    };

    // 이미지가 있고 로드 실패하지 않았을 때만 <img> 사용
    const hasImage = Boolean(profile.profileImage) && !avatarFallback;

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
                                    src={profile.profileImage!}
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
                            <span className="meta-label">최근 수정일</span>
                            <span className="meta-value">{updated || '-'}</span>
                        </div>

                        {/* ✅ 매너온도 (별점 대신) */}
                        <div className="meta">
                            <span className="meta-label">매너온도</span>
                            <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MannerTemp
                                    score5={typeof ratingAvg === 'number' ? ratingAvg : undefined}
                                    count={typeof ratingCount === 'number' ? ratingCount : undefined}
                                    className="size-sm manner-row--profile"   // ← 추가!
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
                                <span>{favorites}개</span>
                                <button
                                    type="button"
                                    className="chip"
                                    onClick={() => comingSoon('찜한 상품')}
                                >
                                    보기
                                </button>
                            </div>
                        </div>

                        {/* 구매내역 */}
                        <div className="meta">
                            <span className="meta-label">구매내역</span>
                            <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>{purchases}개</span>
                                <button
                                    type="button"
                                    className="chip"
                                    onClick={() => comingSoon('구매내역')}
                                >
                                    보기
                                </button>
                            </div>
                        </div>

                        <div className="meta">
                            <span className="meta-label">리뷰내역</span>
                            <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>{purchases}개</span>
                                <button
                                    type="button"
                                    className="chip"
                                    onClick={() => comingSoon('리뷰내역')}
                                >
                                    보기
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 액션 */}
                    <div className="profile-actions">
                        <button type="button" className="btn primary" onClick={openEdit}>
                            프로필 수정
                        </button>
                    </div>
                </div>
            </div>

            {/* 수정 모달: 라우팅 없이 그 자리에서 열림 */}
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
