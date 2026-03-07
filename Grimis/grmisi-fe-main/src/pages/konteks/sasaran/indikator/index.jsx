import PageHeader from '@/components/shared/pageHeader/PageHeader'
import IndikatorHeader from '@/components/indikatorKonteks/IndikatorHeader'
import IndikatorTabel from '@/components/indikatorKonteks/IndikatorTabel'

const KonteksSasaranIndikatorIndex = () => {
    return (
        <>
            <PageHeader>
                <IndikatorHeader />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <IndikatorTabel />
                </div>
            </div>
        </>
    )
}

export default KonteksSasaranIndikatorIndex