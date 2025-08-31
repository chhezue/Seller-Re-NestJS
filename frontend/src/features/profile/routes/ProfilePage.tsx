import React from 'react';
import useProfile from '../hooks/useProfile';
import UserProfile from '../components/UserProfile';

const ProfilePage: React.FC = () => {
    const { profile, loading, error, loadProfile } = useProfile();

    return (
        <div className="page page-profile">
            <h2 className="page-title">
                <span className="page-title__text">내 프로필</span>
            </h2>

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
