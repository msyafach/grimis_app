import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import EvaluasiRisikoTabel from '@/components/evaluasiRisiko/EvaluasiRisikoTabel'
import EvaluasiRisikoHeader from '@/components/evaluasiRisiko/EvaluasiRisikoHeader'

const EvaluasiRisiko = () => {
    return (
        <>
            <PageHeader>
                <EvaluasiRisikoHeader />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <EvaluasiRisikoTabel />
                </div>
            </div>
        </>
    )
}

export default EvaluasiRisiko;
