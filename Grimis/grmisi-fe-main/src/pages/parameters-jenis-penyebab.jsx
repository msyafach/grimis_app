import PageHeader from '@/components/shared/pageHeader/PageHeader'
import JenisPenyebabHeader from '@/components/jenisPenyebab/JenisPenyebabHeader'
import JenisPenyebabTabel from '@/components/jenisPenyebab/JenisPenyebabTabel'
import Footer from '@/components/shared/Footer'

const JenisPenyebab = () => {
    return (
        <>
            <PageHeader>
                <JenisPenyebabHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <JenisPenyebabTabel />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default JenisPenyebab


