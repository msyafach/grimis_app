import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import ActualRiskContent from '@/components/registerRisikoActualRisk/ActualRiskContent'

const ActualRisk = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <ActualRiskContent />
                </div>
            </div>
        </>
    )
}

export default ActualRisk;
