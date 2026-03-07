import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import StrukturOrganisasiTambahContent from '@/components/strukturOrganisasiTambah/StrukturOrganisasiTambahContent'
import Footer from '@/components/shared/Footer'

const StrukturOrganisasiTambah = () => {
    const [resetKey, setResetKey] = useState(0);

    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <StrukturOrganisasiTambahContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default StrukturOrganisasiTambah