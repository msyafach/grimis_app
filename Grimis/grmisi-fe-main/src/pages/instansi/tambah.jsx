import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import InstansiTambahContent from '@/components/instansiTambah/InstansiTambahContent';
import Footer from '@/components/shared/Footer'

const InstansiTambah = () => {
    const [resetKey, setResetKey] = useState(0);

    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <InstansiTambahContent resetKey={setResetKey} key={resetKey} />
            </div>
            <Footer />
        </>
    )
}

export default InstansiTambah