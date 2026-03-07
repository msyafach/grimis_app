import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import EvaluasiRisikoRtpRealisasiContent from '@/components/evaluasiRisikoRtpRealisasi/EvaluasiRisikoRtpRealisasiContent';

const EvaluasiRisikoRtpRealisasi = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <EvaluasiRisikoRtpRealisasiContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default EvaluasiRisikoRtpRealisasi;
