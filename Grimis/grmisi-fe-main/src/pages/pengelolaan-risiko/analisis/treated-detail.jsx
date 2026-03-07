import PageHeader from '@/components/shared/pageHeader/PageHeader';
import TreatedRiskHeader from '@/components/analisisRisikoTreated/Header';
import TreatedRiskContent from '@/components/analisisRisikoTreated/TreatedRiskContent';
import Footer from '@/components/shared/Footer'

const AnalisisTreated = () => {
    return (
        <>
            <PageHeader>
                <TreatedRiskHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <TreatedRiskContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AnalisisTreated


