import PageHeader from '@/components/shared/pageHeader/PageHeader';
import KriteriaDampakEditContent from '@/components/kriteriaRisikoDampakEdit/KriteriaDampakEditContent';

const KriteriaRisikoDampakEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KriteriaDampakEditContent />
                </div>
            </div>
        </>
    )
}

export default KriteriaRisikoDampakEdit