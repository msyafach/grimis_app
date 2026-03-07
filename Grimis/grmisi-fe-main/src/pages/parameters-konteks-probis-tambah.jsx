import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksProbisTambahContent from '@/components/konteksProbisTambah/KonteksProbisTambahContent'

const KonteksProbisTambah = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <KonteksProbisTambahContent />
                </div>
            </div>
        </>
    )
}

export default KonteksProbisTambah