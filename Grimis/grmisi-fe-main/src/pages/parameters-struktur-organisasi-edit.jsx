import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import StrukturOrganisasiEditContent from '@/components/strukturOrganisasiEdit/strukturOrganisasiEdit'
import Footer from '@/components/shared/Footer'

const StrukturOrganisasiEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <StrukturOrganisasiEditContent />
                </div>
            </div>
        </>
    )
}

export default StrukturOrganisasiEdit