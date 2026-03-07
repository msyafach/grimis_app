import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KategoriRisikoHeader from '@/components/kategoriRisiko/KategoriRisikoHeader'
import KategoriRisikoTabel from '@/components/kategoriRisiko/KategoriRisikoTabel'
import Footer from '@/components/shared/Footer'

const KategoriRisiko = () => {
    return (
        <>
            <PageHeader>
                <KategoriRisikoHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KategoriRisikoTabel />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KategoriRisiko


