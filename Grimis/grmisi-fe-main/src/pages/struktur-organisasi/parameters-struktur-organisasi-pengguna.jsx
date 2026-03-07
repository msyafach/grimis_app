import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import StrukturOrganisasiPenggunaHeader from '@/components/strukturOrganisasiPengelola/StrukturOrganisasiPenggunaHeader';
import StrukturOrganisasiPenggunaTabel from '@/components/strukturOrganisasiPengelola/StrukturOrganisasiPenggunaTabel';
import Footer from '@/components/shared/Footer'

const StrukturOrganisasiPengguna = () => {
    return (
        <>
            <PageHeader>
                <StrukturOrganisasiPenggunaHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <StrukturOrganisasiPenggunaTabel />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default StrukturOrganisasiPengguna


