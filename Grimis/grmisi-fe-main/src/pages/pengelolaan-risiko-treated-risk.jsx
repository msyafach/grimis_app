import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import TreatedRiskContent from '@/components/registerRisikoTreatedRisk/TreatedRiskContent'

const TreatedlRisk = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <TreatedRiskContent />
                </div>
            </div>
        </>
    )
}

export default TreatedlRisk;
