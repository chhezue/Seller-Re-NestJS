// features/profile/routes/EditProfilePage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useProfile from '../hooks/useProfile';
import EditProfileModal from '../components/EditProfileModal';

type LocState = { from?: string };

const EditProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation() as { state?: LocState };
    const { profile, loading, error, loadProfile, setProfile, updateProfile } = useProfile();

    const [open, setOpen] = useState(true);
    const [pendingToast, setPendingToast] = useState<string | null>(null); // ✅ 저장 성공 시 전달할 토스트 메시지

    const backTo = useMemo(() => location.state?.from || '/profile', [location.state?.from]);

    const goBack = (withToast?: string | null) => {
        navigate(backTo, {
            replace: true,
            state: withToast
                ? { toast: withToast, refresh: true }
                : { refresh: true },
        });
    };

    // 모달 닫히면 약간의 지연 후 한 번만 돌아가기
    useEffect(() => {
        if (!open) {
            const t = setTimeout(() => {
                goBack(pendingToast);
                setPendingToast(null); // 다음 진입 시 잔여 상태 제거
            }, 500); // 살짝 늦춰 자연스러운 전환
            return () => clearTimeout(t);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // 프로필 없으면 로드
    useEffect(() => {
        if (!profile && !loading && !error) {
            void loadProfile();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, loading, error]);

    // 인증 오류 시 로그인으로
    useEffect(() => {
        if (error && /로그인|세션/i.test(error)) {
            navigate('/login', { replace: true, state: { next: '/profile/edit' } });
        }
    }, [error, navigate]);

    return (
        <div className="page page-profile">
            {loading && <p>프로필 불러오는 중...</p>}
            {error && !loading && <p className="error-text">{error}</p>}

            {profile && (
                <EditProfileModal
                    open={open}
                    profile={profile}
                    onClose={() => setOpen(false)}
                    onSaved={(p) => {
                        // ✅ 저장 성공: 프로필 반영 + 성공 토스트 예약 + 모달 닫기
                        setProfile(p);
                        setPendingToast('프로필이 수정되었습니다. 🎉');
                        setOpen(false);
                    }}
                    onSave={updateProfile}
                    closeOnBackdrop={false}
                />
            )}
        </div>
    );
};

export default EditProfilePage;
