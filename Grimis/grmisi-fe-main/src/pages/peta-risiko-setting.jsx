import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import DashboardMatriks from '@/components/petaRisiko/DashboardMatriks'

const PetaRisikoSetting = () => {
    return (
        <>
            <PageHeader >
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <DashboardMatriks />
                </div>
            </div>
        </>
    )
}

export default PetaRisikoSetting