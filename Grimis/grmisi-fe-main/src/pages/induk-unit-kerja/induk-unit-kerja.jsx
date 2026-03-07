import PageHeader from '@/components/shared/pageHeader/PageHeader'
import IndukUnitKerjaHeader from '@/components/indukUnitKetja/indukUnitKerjaHeader';
import IndukUnitKerjaTabel from '@/components/indukUnitKetja/indukUnitKerjaTabel';
import Footer from '@/components/shared/Footer'

const IndukUnitKerja = () => {
    return (
        <>
            <PageHeader>
                <IndukUnitKerjaHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <IndukUnitKerjaTabel />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default IndukUnitKerja