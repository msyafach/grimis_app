import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KonteksSasaranHeader from '@/components/konteksSasaran/KonteksSasaranHeader'
import KonteksSasaranTabel from '@/components/konteksSasaran/KonteksSasaranTabel'

const KonteksSasaran = () => {
    return (
        <>
            <PageHeader>
                <KonteksSasaranHeader />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <KonteksSasaranTabel />
                </div>
            </div>
        </>
    )
}

export default KonteksSasaran