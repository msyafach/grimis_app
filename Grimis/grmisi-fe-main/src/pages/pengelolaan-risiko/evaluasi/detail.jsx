import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import EvaluasiRisikoHeader from '@/components/evaluasiRisikoDetail/EvaluasiRisikoHeader';
import EvaluasiRisikoDetailContent from '@/components/evaluasiRisikoDetail/EvaluasiRisikoDetailContent';

const EvaluasiRisikoDetail = () => {

    return (
        <>
            <PageHeader>
                <EvaluasiRisikoHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <EvaluasiRisikoDetailContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default EvaluasiRisikoDetail;
