import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import StrukturOrganisasiHeader from '@/components/strukturOrganisasi/StrukturOrganisasiHeader'
import StrukturOrganisasiTabel from '@/components/strukturOrganisasi/StrukturOrganisasiTabel'
import Footer from '@/components/shared/Footer'

const StrukturOrganisasi = () => {
    return (
        <>
            <PageHeader>
                <StrukturOrganisasiHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <StrukturOrganisasiTabel />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default StrukturOrganisasi


