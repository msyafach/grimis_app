import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import ProfileHeader from '@/components/profile/ProfileHeader';
import EditProfileForm from '@/components/profile/EditProfileForm';
import Footer from '@/components/shared/Footer';

const EditProfile = () => {
    return (
        <>
            <PageHeader>
                <ProfileHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <EditProfileForm />
            </div>
            <Footer />
        </>
    );
};

export default EditProfile; 