import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import IndukUnitKerjaEditContent from '@/components/indukUnitKerjaEdit/indukUnitKerjaEditContent'
import Footer from '@/components/shared/Footer'

const IndukUnitKerjaEdit = () => {
    return (
        <>
            <PageHeader />
            <div className="main-content" style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <IndukUnitKerjaEditContent />
                </div>
            </div>
            <Footer />
        </>
    );
}

export default IndukUnitKerjaEdit;
