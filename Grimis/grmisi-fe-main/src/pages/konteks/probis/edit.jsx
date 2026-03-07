import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksProbisEditContent from '@/components/konteksProbisEdit/KonteksProbisEditContent';
import Footer from '@/components/shared/Footer';
const KonteksProbisEdit = () => {
    const [resetKey, setResetKey] = useState(0);
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KonteksProbisEditContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KonteksProbisEdit