import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import IndikatorKonteksEditContent from '@/components/indiktatorKonteksEdit/IndikatorKonteksEditContent';

const KonteksSasaranIndikatorEdit = () => {
    const [resetKey, setResetKey] = useState(0);
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <IndikatorKonteksEditContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
        </>
    )
}

export default KonteksSasaranIndikatorEdit