import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import IndikatorKonteksDetailContent from '@/components/indiktatorKonteksDetail/IndikatorKonteksDetailContent';
import IndikatorHeader from '@/components/indiktatorKonteksDetail/IndikatorHeader';
import Footer from '@/components/shared/Footer';

const KonteksSasaranIndikatorDetail = () => {
    const [resetKey, setResetKey] = useState(0);
    return (
        <>
            <PageHeader>
                <IndikatorHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <IndikatorKonteksDetailContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KonteksSasaranIndikatorDetail