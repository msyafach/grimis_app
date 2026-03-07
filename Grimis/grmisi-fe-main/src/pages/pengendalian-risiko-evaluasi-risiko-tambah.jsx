import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import EvaluasiRisikoTambahContent from '@/components/evaluasiRisikoTambah/EvaluasiRisikoTambahContent'


const EvaluasiRisikoTambah = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <EvaluasiRisikoTambahContent />
                </div>
            </div>
        </>
    )
}

export default EvaluasiRisikoTambah;
