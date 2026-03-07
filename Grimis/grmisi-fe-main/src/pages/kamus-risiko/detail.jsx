import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KamusRisikoHeader from '@/components/kamusRisikoDetail/Header';
import KamusRisikoDetailContent from '@/components/kamusRisikoDetail/KamusRisikoDetailContent'
import Footer from '@/components/shared/Footer'

const KamusRisikoDetail = () => {
    const [resetKey, setResetKey] = useState(0);
    return (
        <>
            <PageHeader>
                <KamusRisikoHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KamusRisikoDetailContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KamusRisikoDetail


