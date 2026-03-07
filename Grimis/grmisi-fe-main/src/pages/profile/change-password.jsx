import React from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ChangePasswordForm from '@/components/profile/ChangePasswordForm';
import Footer from '@/components/shared/Footer';

const ChangePassword = () => {
    return (
        <>
            <PageHeader>
                <ProfileHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <ChangePasswordForm />
            </div>
            <Footer />
        </>
    );
};

export default ChangePassword; 