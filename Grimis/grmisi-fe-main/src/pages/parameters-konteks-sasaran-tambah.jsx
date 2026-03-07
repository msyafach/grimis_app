import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksSasaranTambahContent from '@/components/konteksSasaranTambah/KonteksSasaranTambahContent'

const KonteksSasaranTambah = () => {
    const [resetKey, setResetKey] = useState(0);

    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KonteksSasaranTambahContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
        </>
    )
}

export default KonteksSasaranTambah