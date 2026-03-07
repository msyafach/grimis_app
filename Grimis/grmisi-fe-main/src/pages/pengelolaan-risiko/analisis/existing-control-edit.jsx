import { useRef } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import AnalisisExistingControlEditHeader from '@/components/analisisRisikoExistingControlEdit/AnalisisExistingControlEditHeader';
import AnalisisExistingControlEditTabel from '@/components/analisisRisikoExistingControlEdit/AnalisisExistingControlEditTabel';
import Footer from '@/components/shared/Footer';

const AnalisisExistingControlEdit = () => {
    const tabelRef = useRef();

    const handleUploadSuccess = () => {
        if (tabelRef.current) {
            tabelRef.current.reload();
        }
    };

    return (
        <>
            <PageHeader>
                <AnalisisExistingControlEditHeader onUploadSuccess={handleUploadSuccess} />
            </PageHeader>
            <div className="main-content" style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className="row">
                    <AnalisisExistingControlEditTabel ref={tabelRef} />
                </div>
            </div>
            <Footer />
        </>
    );
};

export default AnalisisExistingControlEdit;
