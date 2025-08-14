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

    const backTo = useMemo(() => location.state?.from || '/profile', [location.state?.from]);

    const goBack = () => {
        navigate(backTo, { replace: true });
    };

    useEffect(() => {
        if (!open) goBack();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!profile && !loading && !error) {
            void loadProfile();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, loading, error]);

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
                        setProfile(p);
                        navigate('/profile', {
                            replace: true,
                            state: { toast: '프로필이 수정되었습니다. 🎉', refresh: true },
                        });
                    }}
                    onSave={updateProfile}
                    closeOnBackdrop={false}
                />
            )}
        </div>
    );
};

export default EditProfilePage;
