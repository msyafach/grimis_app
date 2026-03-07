import React, { useState } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import StrukturOrganisasiPenggunaTambahContent from '@/components/strukturOrganisasiPenggunaTambah/StrukturOrganisasiPenggunaTambahContent'
import Footer from '@/components/shared/Footer'

const StrukturOrganisasiPenggunaTambah = () => {
    const [resetKey, setResetKey] = useState(0);
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <StrukturOrganisasiPenggunaTambahContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default StrukturOrganisasiPenggunaTambah


