import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useProfile from '../hooks/useProfile';
import UserProfile from '../components/UserProfile';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation() as { state?: { toast?: string; refresh?: boolean } };
    const { profile, loading, error, loadProfile } = useProfile();

    useEffect(() => {
        const s = location.state;
        if (!s) return;
        if (s.refresh) loadProfile();
        if (s.toast) toast.success(s.toast);
        navigate('.', { replace: true, state: undefined }); // 중복 방지
    }, [location.state, navigate, loadProfile]);

    return (
        <div className="page page-profile">
            <h1 className="page-title">내 프로필</h1>

            <UserProfile
                profile={profile}
                loading={loading}
                error={error}
                onRefresh={loadProfile}
                onEdit={() => navigate('/profile/edit', { state: { from: '/profile' } })}
            />
        </div>
    );
};

export default ProfilePage;
