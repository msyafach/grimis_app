import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import KamusRisikoTambahContent from '@/components/kamusRisikoTambah/KamusRisikoTambahContent'

const KamusRisikoTambah = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <KamusRisikoTambahContent />
                </div>
            </div>
        </>
    )
}

export default KamusRisikoTambah


