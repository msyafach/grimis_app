import PageHeader from '@/components/shared/pageHeader/PageHeader';
import ActualRiskHeader from '@/components/analisisRisikoActual/Header';
import ActualRiskContent from '@/components/analisisRisikoActual/AnalisisRiskContent';
import Footer from '@/components/shared/Footer'

const AnalisisActual = () => {
    return (
        <>
            <PageHeader>
                <ActualRiskHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <ActualRiskContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AnalisisActual


