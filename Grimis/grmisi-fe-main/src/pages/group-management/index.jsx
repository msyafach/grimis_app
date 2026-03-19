import PageHeader from '@/components/shared/pageHeader/PageHeader'
import GroupHeader from '@/components/groupManagement/GroupHeader';
import GroupTable from '@/components/groupManagement/GroupTable';
import Footer from '@/components/shared/Footer'

const GroupManagement = () => {
    return (
        <>
            <PageHeader>
                <GroupHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <GroupTable />
            </div>
            <Footer />
        </>
    )
}

export default GroupManagement
