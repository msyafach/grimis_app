import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import EvaluasiRisikoRtpTambahContent from '@/components/evaluasiRisikoRtpTambah/EvaluasiRisikoRtpTambahContent';

const EvaluasiRisikoRtpTambah = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <EvaluasiRisikoRtpTambahContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default EvaluasiRisikoRtpTambah;
