import { useEffect } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useTahun } from '../../../context/TahunContext';
import { useAppLoading } from '../../../context/AppLoadingContext';

const YearModal = () => {
    const { tahunId, tahunList, setTahunId, fetchAvailableYears } = useTahun();
    const { setLoadingRedirect, setLoadingMessage } = useAppLoading();
    const navigate = useNavigate();

    useEffect(() => {
        if (tahunList.length === 0) {
            fetchAvailableYears();
        }
    }, [fetchAvailableYears, tahunList.length]);

    const handleYearSelect = (year) => {
        if (year === tahunId) {
            setLoadingMessage('Mengganti Tahun...');
            setLoadingRedirect(true);
            navigate('/');
            return;
        }

        setTahunId(year);
        localStorage.setItem('tahun', year);
        setLoadingMessage('Mengganti Tahun...');
        setLoadingRedirect(true);
        navigate('/');
    };

    return (
        <div className="dropdown nxl-h-item">
            <div
                className="nxl-navigation-toggle me-3 btn btn-light text-dark border border-dark rounded-pill"
                data-bs-toggle="dropdown"
                role="button"
                data-bs-auto-close="outside"
            >
                <FiCalendar size={15} />
                <span className="ms-2">{tahunId || 'Pilih Tahun'}</span>
            </div>
            <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown">
                <h6 className="fw-bold text-dark mb-2 px-3">Pilih Tahun</h6>
                <div className="year-list">
                    {tahunList.length === 0 ? (
                        <div className="px-3 py-2 text-muted d-flex align-items-center gap-2">
                            <Spinner animation="border" size="sm" />
                            Memuat Tahun...
                        </div>
                    ) : (
                        tahunList.map((year) => (
                            <Link
                                key={year}
                                to="#"
                                className={`dropdown-item ${tahunId === year ? 'active' : ''}`}
                                onClick={() => handleYearSelect(year)}
                            >
                                {year}
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default YearModal;
