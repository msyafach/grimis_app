import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import JenisPenyebabTambahContent from '@/components/jenisPenyebabTambah/JenisPenyebabTambahContent'
import Footer from '@/components/shared/Footer'

const JenisPenyebabTambah = () => {
    const [resetKey, setResetKey] = useState(0);

    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <JenisPenyebabTambahContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default JenisPenyebabTambah


