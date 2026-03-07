import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import EvaluasiRisikoRtpContent from '@/components/evaluasiRisikoRtpEdit/EvaluasiRisikoRtpEditContent'


const EvaluasiRisikoRtpEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <EvaluasiRisikoRtpContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default EvaluasiRisikoRtpEdit;
