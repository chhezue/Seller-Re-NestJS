import React from 'react';
import useProfile from '../hooks/useProfile';
import UserProfile from '../components/UserProfile';

const ProfilePage: React.FC = () => {
    const { profile, loading, error, loadProfile } = useProfile();

    return (
        <div className="page page-profile">
            <h1 className="page-title">내 프로필</h1>

            <UserProfile
                profile={profile}
                loading={loading}
                error={error}
                onRefresh={loadProfile}
            />
        </div>
    );
};

export default ProfilePage;
