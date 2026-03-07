import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import KamusRisikoHeader from '@/components/kamusRisiko/KamusRisikoHeader'
import KamusRisikoTabel from '@/components/kamusRisiko/KamusRisikoTabel'

const KamusRisiko = () => {
    return (
        <>
            <PageHeader>
                <KamusRisikoHeader />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <KamusRisikoTabel />
                </div>
            </div>
        </>
    )
}

export default KamusRisiko


