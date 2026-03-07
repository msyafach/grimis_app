import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksProbisHeader from '@/components/konteksProbis/KonteksProbisHeader'
import KonteksProbisTabel from '@/components/konteksProbis/KonteksProbisTabel'

const KonteksProbis = () => {
    return (
        <>
            <PageHeader>
                <KonteksProbisHeader />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <KonteksProbisTabel />
                </div>
            </div>
        </>
    )
}

export default KonteksProbis