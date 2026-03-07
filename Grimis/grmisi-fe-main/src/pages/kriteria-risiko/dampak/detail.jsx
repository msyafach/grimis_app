import PageHeader from '@/components/shared/pageHeader/PageHeader';
import KriteriaDampakDetailContent from '@/components/kriteriaRisikoDampakDetail/KriteriaDampakDetailContent';

const KriteriaRisikoDampakDetail = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KriteriaDampakDetailContent />
                </div>
            </div>
        </>
    )
}

export default KriteriaRisikoDampakDetail