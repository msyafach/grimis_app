import { useState } from 'react';;
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import KriteriaRisikoKemungkinanHeader from '@/components/kriteriaRisikoKemungkinan/Header';
import KriteriaRisikoKemungkinanTabel from '@/components/kriteriaRisikoKemungkinan/Tabel';

const KriteriaRisikoKemungkinanIndex = () => {
    const [resetKey, setResetKey] = useState(0);

    return (
        <>
            <PageHeader>
                <KriteriaRisikoKemungkinanHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KriteriaRisikoKemungkinanTabel resetKey={setResetKey} key={resetKey} />
                </div>
            </div>
        </>
    )
}

export default KriteriaRisikoKemungkinanIndex