import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksSasaranTambahContent from '@/components/konteksSasaranTambah/KonteksSasaranTambahContent'
import Footer from '@/components/shared/Footer';
import { useAuth } from '@/context/AuthContext';

const KonteksSasaranTambah = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";
    const pageTitle = isAdmin ? "Tambah Konteks Sasaran" : "Usulkan Konteks Sasaran";
    const [resetKey, setResetKey] = useState(0);

    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 50px)' }}>
                <div className='row'>
                    <KonteksSasaranTambahContent title={pageTitle} resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KonteksSasaranTambah