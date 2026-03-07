import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileDetailsComponent from '@/components/profile/ProfileDetails';
import Footer from '@/components/shared/Footer';

const ProfileDetails = () => {
    return (
        <>
            <PageHeader>
                <ProfileHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <ProfileDetailsComponent />
            </div>
            <Footer />
        </>
    );
};

export default ProfileDetails; 