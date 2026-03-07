import PageHeader from '@/components/shared/pageHeader/PageHeader'
import ProsesAkhirTahunContent from '@/components/prosesAkhirTahun/ProsesAkhirTahunContent'
import Footer from '@/components/shared/Footer'

const ProsesAkhirTahun = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <ProsesAkhirTahunContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ProsesAkhirTahun;
