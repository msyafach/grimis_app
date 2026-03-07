import PageHeader from '@/components/shared/pageHeader/PageHeader';
import KriteriaKemungkinanEditContent from '@/components/kriteriaRisikoKemungkinanEdit/Content';

const KriteriaRisikoKemungkinanEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KriteriaKemungkinanEditContent />
                </div>
            </div>
        </>
    )
}

export default KriteriaRisikoKemungkinanEdit