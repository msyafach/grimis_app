import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksHeader from '@/components/konteks/KonteksHeader'
import KonteksContent from '@/components/konteks/KonteksContent'

const Konteks = () => {
    return (
        <>
            <PageHeader>
                <KonteksHeader />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <KonteksContent />
                </div>
            </div>
        </>
    )
}

export default Konteks