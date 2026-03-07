import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksProbisHeader from '@/components/konteksProbisDetail/Header';
import KonteksProbisDetailContent from '@/components/konteksProbisDetail/KonteksProbisDetailContent';
import Footer from '@/components/shared/Footer';

const KonteksProbisDetail = () => {
    const [resetKey, setResetKey] = useState(0);
    return (
        <>
            <PageHeader>
                <KonteksProbisHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KonteksProbisDetailContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KonteksProbisDetail