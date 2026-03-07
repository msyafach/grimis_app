import PageHeader from '@/components/shared/pageHeader/PageHeader';
import ActualRiskEditContent from '@/components/analisisRisikoActualEdit/ActualRiskEditContent';
import Footer from '@/components/shared/Footer'

const AnalisisActualEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <ActualRiskEditContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AnalisisActualEdit


