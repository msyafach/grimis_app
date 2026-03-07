import React, { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import IndukUnitKerjaTambahContent from '@/components/indukUnitKerjaTambah/IndukUnitKerjaTambahContent';
import Footer from '@/components/shared/Footer'

const IndukUnitKerjaTambah = () => {
    const [resetKey, setResetKey] = useState(0);

    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <IndukUnitKerjaTambahContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default IndukUnitKerjaTambah