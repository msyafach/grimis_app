import PageHeader from '@/components/shared/pageHeader/PageHeader';
import ResidualRiskEditContent from '@/components/analisisRisikoResidualEdit/ResidualRiskEditContent';
import Footer from '@/components/shared/Footer'

const AnalisisResidualEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <ResidualRiskEditContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AnalisisResidualEdit


