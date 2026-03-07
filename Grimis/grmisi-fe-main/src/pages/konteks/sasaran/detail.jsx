import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksSasaranDetailContent from '@/components/konteksSasaranDetail/KonteksSasaranDetailContent'
import KonteksSasaranHeader from '@/components/konteksSasaranDetail/Header'
import Footer from '@/components/shared/Footer'

const KonteksSasaranDetail = () => {
    return (
        <>
            <PageHeader>
                <KonteksSasaranHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KonteksSasaranDetailContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KonteksSasaranDetail


