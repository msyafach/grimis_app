import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksProbisTambahContent from '@/components/konteksProbisTambah/KonteksProbisTambahContent';
import Footer from '@/components/shared/Footer';
import { useAuth } from '@/context/AuthContext';

const KonteksProbisTambah = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";
    const pageTitle = isAdmin ? "Tambah Konteks Probis" : "Usulkan Konteks Probis";
    const [resetKey, setResetKey] = useState(0);
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KonteksProbisTambahContent title={pageTitle} resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KonteksProbisTambah