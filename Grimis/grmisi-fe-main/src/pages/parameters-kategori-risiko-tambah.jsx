import { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KategoriRisikoTambahContent from '@/components/kategoriRisikoTambah/KategoriRisikoTambahContent'
import Footer from '@/components/shared/Footer'

const KategoriRisikoTambah = () => {
    const [resetKey, setResetKey] = useState(0);

    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KategoriRisikoTambahContent resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KategoriRisikoTambah


