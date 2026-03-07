import PageHeader from '@/components/shared/pageHeader/PageHeader';
import InherentRiskHeader from '@/components/analisisRisikoInherent/Header';
import InherentRiskContent from '@/components/analisisRisikoInherent/InherentRiskContent';
import Footer from '@/components/shared/Footer'

const AnalisisInherent = () => {
    return (
        <>
            <PageHeader>
                <InherentRiskHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <InherentRiskContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AnalisisInherent


