import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import InherentRiskContent from '@/components/registrasiRisikoInherentRisk/InherentRiskContent'

const InherentRisk = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <InherentRiskContent />
                </div>
            </div>
        </>
    )
}

export default InherentRisk