import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import EvaluasiRisikoHeader from '@/components/evaluasiRisikoTambah/EvaluasiRisikoHeader';
import EvaluasiRisikoTambahContent from '@/components/evaluasiRisikoTambah/EvaluasiRisikoTambahContent'

const EvaluasiRisikoTambah = () => {
    const [resetKey, setResetKey] = useState(0);

    return (
        <>
            <PageHeader>
                <EvaluasiRisikoHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <EvaluasiRisikoTambahContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default EvaluasiRisikoTambah;
