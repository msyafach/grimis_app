import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import EvaluasiRisikoRtpHeader from '@/components/evaluasiRisikoDetailRtp/EvaluasiRisikoRtpHeader';
import EvaluasiRisikoRtpTabel from '@/components/evaluasiRisikoDetailRtp/EvaluasiRisikoRtpTabel';
import EvaluasiRisikoRtpTabelFrekuensi from '@/components/evaluasiRisikoDetailRtp/EvaluasiRisikoRtpTabelFrekuensi';

const EvaluasiRisikoRtpDetailIndex = () => {
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

export default EvaluasiRisikoRtpDetailIndex;
