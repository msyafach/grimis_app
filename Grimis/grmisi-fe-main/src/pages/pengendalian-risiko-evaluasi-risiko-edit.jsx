import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import EvaluasiRisikoEditContent from '@/components/evaluasiRisikoEdit/EvaluasiRisikoEditContent'


const EvaluasiRisikoEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <EvaluasiRisikoEditContent />
                </div>
            </div>
        </>
    )
}

export default EvaluasiRisikoEdit;
