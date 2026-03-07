import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import EvaluasiRisikoRtpDetailHeader from '@/components/evaluasiRisikoRtpDetail/Header';
import EvaluasiRisikoRtpDetailContent from '@/components/evaluasiRisikoRtpDetail/EvaluasiRisikoRtpDetailContent';

const EvaluasiRisikoRtpDetail = () => {
    return (
        <>
            <PageHeader>
                <EvaluasiRisikoRtpDetailHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <EvaluasiRisikoRtpDetailContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default EvaluasiRisikoRtpDetail;
