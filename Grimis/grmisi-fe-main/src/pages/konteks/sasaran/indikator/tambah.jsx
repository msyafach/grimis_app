import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import IndikatorKonteksTambahContent from '@/components/indiktatorKonteksTambah/IndikatorKonteksTambahContent';

const KonteksSasaranIndikatorTambah = () => {
    const [resetKey, setResetKey] = useState(0);
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <IndikatorKonteksTambahContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
        </>
    )
}

export default KonteksSasaranIndikatorTambah