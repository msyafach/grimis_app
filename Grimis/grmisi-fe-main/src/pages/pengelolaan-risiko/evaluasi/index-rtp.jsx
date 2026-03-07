import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import EvaluasiRisikoRtpHeader from '@/components/evaluasiRisikoRtp/EvaluasiRisikoRtpHeader';
import EvaluasiRisikoRtpTabel from '@/components/evaluasiRisikoRtp/EvaluasiRisikoRtpTabel';
import EvaluasiRisikoRtpTabelFrekuensi from '@/components/evaluasiRisikoRtp/EvaluasiRisikoRtpTabelFrekuensi';

const EvaluasiRisikoRtpIndex = () => {
    return (
        <>
            <PageHeader>
                <EvaluasiRisikoRtpHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <EvaluasiRisikoRtpTabelFrekuensi />
                    <EvaluasiRisikoRtpTabel />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default EvaluasiRisikoRtpIndex;
