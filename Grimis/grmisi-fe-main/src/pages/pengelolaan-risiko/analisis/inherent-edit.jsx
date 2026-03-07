import PageHeader from '@/components/shared/pageHeader/PageHeader';
import InherentRiskEditContent from '@/components/analisisRisikoInherentEdit/InherentRiskEditContent';
import Footer from '@/components/shared/Footer'

const AnalisisInherentEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <InherentRiskEditContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AnalisisInherentEdit


