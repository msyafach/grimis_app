import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KategoriRisikoEditContent from '@/components/kategoriRisikoEdit/KategoriRisikoEditContent'
import Footer from '@/components/shared/Footer'

const KategoriRisikoEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <KategoriRisikoEditContent />
                </div>
            </div>
        </>
    )
}

export default KategoriRisikoEdit


