import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import ResidualRiskContent from '@/components/registerRisikoResidualRisk/ResidualRiskContent'

const ResidualRisk = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <ResidualRiskContent />
                </div>
            </div>
        </>
    )
}

export default ResidualRisk;
