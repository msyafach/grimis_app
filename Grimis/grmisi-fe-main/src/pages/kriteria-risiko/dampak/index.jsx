import { useState } from 'react';;
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import KriteriaRisikoDampakHeader from '@/components/kriteriaRisikoDampak/KriteriaRisikoKemungkinanHeader';
import KriteriaRisikoDampakTabel from '@/components/kriteriaRisikoDampak/KriteriaRisikoDampakTabel';

const KriteriaRisikoDampakIndex = () => {
    const [resetKey, setResetKey] = useState(0);

    return (
        <>
            <PageHeader>
                <KriteriaRisikoDampakHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KriteriaRisikoDampakTabel resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
        </>
    )
}

export default KriteriaRisikoDampakIndex