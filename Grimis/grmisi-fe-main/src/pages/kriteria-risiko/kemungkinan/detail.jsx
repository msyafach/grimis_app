import PageHeader from '@/components/shared/pageHeader/PageHeader';
import KriteriaKemungkinanDetailContent from '@/components/kriteriaRisikoKemungkinanDetail/Content';

const KriteriaRisikoKemungkinanDetail = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KriteriaKemungkinanDetailContent />
                </div>
            </div>
        </>
    )
}

export default KriteriaRisikoKemungkinanDetail