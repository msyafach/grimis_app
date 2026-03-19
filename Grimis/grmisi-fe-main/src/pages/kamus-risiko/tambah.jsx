import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import KamusRisikoTambahContent from '@/components/kamusRisikoTambah/KamusRisikoTambahContent'
import { useAuth } from '@/context/AuthContext';

const KamusRisikoTambah = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";
    const pageTitle = isAdmin ? "Tambah Kamus Risiko" : "Usulkan Kamus Risiko";
    const [resetKey, setResetKey] = useState(0);
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KamusRisikoTambahContent title={pageTitle} resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KamusRisikoTambah


