import PageHeader from '@/components/shared/pageHeader/PageHeader';
import ResidualRiskHeader from '@/components/analisisRisikoResidual/Header';
import ResidualRiskContent from '@/components/analisisRisikoResidual/ResidualRiskContent';
import Footer from '@/components/shared/Footer'

const AnalisisResidual = () => {
    return (
        <>
            <PageHeader>
                <ResidualRiskHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <ResidualRiskContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AnalisisResidual


