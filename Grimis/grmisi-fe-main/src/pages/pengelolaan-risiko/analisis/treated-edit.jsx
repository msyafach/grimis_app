import PageHeader from '@/components/shared/pageHeader/PageHeader';
import TreatedRiskEditContent from '@/components/analisisRisikoTreatedEdit/TreatedRiskEditContent';
import Footer from '@/components/shared/Footer'

const AnalisisTreatedEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <TreatedRiskEditContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AnalisisTreatedEdit


