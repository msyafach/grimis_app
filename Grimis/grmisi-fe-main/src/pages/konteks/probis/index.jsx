import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksProbisHeader from '@/components/konteksProbis/KonteksProbisHeader'
import KonteksProbisTabel from '@/components/konteksProbis/KonteksProbisTabel'
import Footer from '@/components/shared/Footer';

const KonteksProbisIndex = () => {
    const [resetKey, setResetKey] = useState(0);

    return (
        <>
            <PageHeader>
                <KonteksProbisHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KonteksProbisTabel resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KonteksProbisIndex