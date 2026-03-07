import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom'
import NavigationManu from '@/components/shared/navigationMenu/NavigationMenu'
import Header from '@/components/shared/header/Header'
import useBootstrapUtils from '@/hooks/useBootstrapUtils'
import SupportDetails from '@/components/supportDetails'
import LogoutModal from '@/components/authentication/LogoutModal'
import FullScreenLoader from '@/components/shared/FullScreenLoader';
import { useAppLoading } from '../context/AppLoadingContext';

const RootLayout = () => {
    const pathName = useLocation().pathname
    useBootstrapUtils(pathName)
    // const [dataManajemenPengguna, setDataUser] = useState([]);

    const { loadingRedirect, setLoadingRedirect, setLoadingMessage } = useAppLoading();
    const location = useLocation();
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (loadingRedirect) {
                setLoadingRedirect(false);
                setLoadingMessage('');
            }
        }, 1000); // kecilkan delay agar sinkron

        return () => clearTimeout(timeout);
    }, [loadingRedirect, location.pathname, setLoadingRedirect, setLoadingMessage]);


    const [selectedRootCauses, setSelectedRootCauses] = useState([]);
    const [generatedStatements, setGeneratedStatements] = useState([]);
    // const [generatedRootCauses, setGeneratedRootCauses] = useState([]);
    const [generatedRootCauses, setGeneratedRootCauses] = useState({ root_causes: [] });

    const [loadingGenerate, setLoadingGenerate] = useState(false);
    const [savedRootCauseIds, setSavedRootCauseIds] = useState([]);

    return (
        <>
            {loadingRedirect && <FullScreenLoader />}
            {!loadingRedirect && (
                <>
                    <Header />
                    <NavigationManu />
                    <main className="nxl-container">
                        <div className="nxl-content">
                            <Outlet
                                context={{
                                    setGeneratedStatements,
                                    generatedStatements,
                                    setGeneratedRootCauses,
                                    generatedRootCauses,
                                    setLoadingGenerate,
                                    loadingGenerate,
                                    setSelectedRootCauses,
                                    selectedRootCauses,
                                    savedRootCauseIds,
                                    setSavedRootCauseIds,
                                }}
                            />
                        </div>
                    </main>
                    <SupportDetails />
                    <LogoutModal />
                </>
            )}
        </>
    )
}

export default RootLayout