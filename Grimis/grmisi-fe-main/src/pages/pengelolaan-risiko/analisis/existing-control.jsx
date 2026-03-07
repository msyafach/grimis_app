import { useRef } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import AnalisisExistingControlHeader from '@/components/analisisRisikoExistingControl/AnalisisExistingControlHeader';
import AnalisisExistingControlTabel from '@/components/analisisRisikoExistingControl/AnalisisExistingControlTabel';
import Footer from '@/components/shared/Footer';

const AnalisisExistingControl = () => {
    const tabelRef = useRef();

    const handleUploadSuccess = () => {
        if (tabelRef.current) {
            tabelRef.current.reload();
        }
    };

    return (
        <>
            <PageHeader>
                <AnalisisExistingControlHeader onUploadSuccess={handleUploadSuccess} />
            </PageHeader>
            <div className="main-content" style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className="row">
                    <AnalisisExistingControlTabel ref={tabelRef} />
                </div>
            </div>
            <Footer />
        </>
    );
};

export default AnalisisExistingControl;
