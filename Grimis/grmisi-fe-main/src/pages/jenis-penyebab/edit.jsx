import PageHeader from '@/components/shared/pageHeader/PageHeader'
import JenisPenyebabEditContent from '@/components/jenisPenyebabEdit/JenisPenyebabEditContent'
import Footer from '@/components/shared/Footer'

const JenisPenyebabEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <JenisPenyebabEditContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default JenisPenyebabEdit


