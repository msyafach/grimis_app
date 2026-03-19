import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import IndikatorKonteksTambahContent from '@/components/indiktatorKonteksTambah/IndikatorKonteksTambahContent';
import { useAuth } from '@/context/AuthContext';

const KonteksSasaranIndikatorTambah = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";
    const pageTitle = isAdmin ? "Tambah Indikator" : "Usulkan Indikator";
    const [resetKey, setResetKey] = useState(0);
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <IndikatorKonteksTambahContent title={pageTitle} resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
        </>
    )
}

export default KonteksSasaranIndikatorTambah