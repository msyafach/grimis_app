import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksSasaranHeader from '@/components/konteksSasaran/KonteksSasaranHeader'
import KonteksSasaranTabel from '@/components/konteksSasaran/KonteksSasaranTabel'
import Footer from '@/components/shared/Footer';

const KonteksSasaran = () => {
    return (
        <>
            <PageHeader>
                <KonteksSasaranHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KonteksSasaranTabel />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KonteksSasaran