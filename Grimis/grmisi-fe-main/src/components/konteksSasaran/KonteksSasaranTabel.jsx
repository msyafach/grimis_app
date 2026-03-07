import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Table from '@/components/shared/table/Table';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import { useAuth } from '../../context/AuthContext';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getKonteksSasaranColumns } from './KonteksSasaranColumns';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';

setLanguage('id');

const KonteksSasaranTabel = () => {
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { user } = useAuth();
    const [enabledKonteksSasaran, setEnabledKonteksSasaran] = useState([]);
    const [disabledKonteksSasaran, setDisabledKonteksSasaran] = useState([]);
    const [selectedKonteksSasaran, setSelectedKonteksSasaran] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMessage("");
            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    setErrorMessage("Token tidak tersedia. Silakan login ulang.");
                    setLoading(false);
                    return;
                }

                // Validate instansi ID before fetching data
                const instansiValidation = await validateInstansiId(idInstansi, token);
                if (!instansiValidation.valid) {
                    setErrorMessage(instansiValidation.message);
                    setLoading(false);
                    return;
                }

                // Validate induk unit kerja ID if available
                if (idIndukUnitKerja) {
                    const indukUnitValidation = await validateIndukUnitKerjaId(idIndukUnitKerja, token);
                    if (!indukUnitValidation.valid) {
                        console.warn("Induk unit kerja ID tidak valid, tapi akan tetap melanjutkan operasi");
                    }
                }

                // Fetch enabled contexts
                let enabledResponse;
                if (idIndukUnitKerja) {
                    enabledResponse = await axios.get(
                        `${API_ENDPOINTS.getKonteksSasaranByIndukUnitKerja(idInstansi, idIndukUnitKerja)}&is_disabled=false`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                } else {
                    enabledResponse = await axios.get(
                        `${API_ENDPOINTS.getKonteksSasaranAll(idInstansi)}&is_disabled=false`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                }
                setEnabledKonteksSasaran(enabledResponse.data);

                // Fetch disabled contexts
                let disabledResponse;
                if (idIndukUnitKerja) {
                    disabledResponse = await axios.get(
                        `${API_ENDPOINTS.getKonteksSasaranByIndukUnitKerja(idInstansi, idIndukUnitKerja)}&is_disabled=true`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                } else {
                    disabledResponse = await axios.get(
                        `${API_ENDPOINTS.getKonteksSasaranAll(idInstansi)}&is_disabled=true`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                }
                setDisabledKonteksSasaran(disabledResponse.data);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                const translatedError = translate(errorResponse);
                setErrorMessage(translatedError);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [idInstansi, idIndukUnitKerja]);

    const handleActionClick = useCallback((action, row) => {
        // Check if user is SUPER_ADMIN for delete action
        if (action === 'delete' && user?.role !== 'SUPER_ADMIN') {
            showToast("error", "Anda tidak memiliki hak untuk menghapus data");
            return;
        }

        switch (action) {
            case 'setting':
                navigate(`/parameters/konteks-sasaran/indikator/${row.id}`);
                break;
            case 'view':
                navigate(`/parameters/konteks-sasaran/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/parameters/konteks-sasaran/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedKonteksSasaran(row);
                setShowModal(true);
                break;
            case 'enable':
                handleToggleStatus(row, false);
                break;
            case 'disable':
                handleToggleStatus(row, true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate, user]);

    const handleToggleStatus = async (row, isDisabled) => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                showToast("error", "Token tidak tersedia. Silakan login ulang.");
                return;
            }

            await axios.put(
                API_ENDPOINTS.updateKonteksSasaran(row.id),
                { is_disabled: isDisabled },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            showToast("success", `Konteks Sasaran berhasil ${isDisabled ? 'dinonaktifkan' : 'diaktifkan'}!`);

            // Update the state to reflect the changes
            if (isDisabled) {
                setEnabledKonteksSasaran(prev => prev.filter(item => item.id !== row.id));
                setDisabledKonteksSasaran(prev => [...prev, { ...row, is_disabled: true }]);
            } else {
                setDisabledKonteksSasaran(prev => prev.filter(item => item.id !== row.id));
                setEnabledKonteksSasaran(prev => [...prev, { ...row, is_disabled: false }]);
            }
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            showToast("error", translatedError);
        }
    };

    const handleDelete = async () => {
        if (!selectedKonteksSasaran) return;

        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                showToast("error", "Token tidak tersedia. Silakan login ulang.");
                return;
            }

            // Validate instansi ID before proceeding with delete
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                showToast("error", instansiValidation.message);
                return;
            }

            await axios.delete(API_ENDPOINTS.deleteKonteksSasaran(selectedKonteksSasaran.id), {
                headers: { Authorization: `Bearer ${token}` },
            });

            showToast("success", "Konteks Sasaran berhasil dihapus!");

            // Update both lists
            if (selectedKonteksSasaran.is_disabled) {
                setDisabledKonteksSasaran(prev => prev.filter(item => item.id !== selectedKonteksSasaran.id));
            } else {
                setEnabledKonteksSasaran(prev => prev.filter(item => item.id !== selectedKonteksSasaran.id));
            }

            setShowModal(false);
            setSelectedKonteksSasaran(null);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            showToast("error", translatedError);
        }
    };

    const enabledColumns = useMemo(() => getKonteksSasaranColumns(handleActionClick, user, false), [handleActionClick, user]);
    const disabledColumns = useMemo(() => getKonteksSasaranColumns(handleActionClick, user, true), [handleActionClick, user]);

    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    const activeTitle = (
        <>
            Data Konteks Sasaran <span className="badge badge bg-success text-white">Aktif</span>
        </>
    );
    const nonActiveTitle = (
        <>
            Data Konteks Sasaran <span className="badge badge bg-danger text-white">Non Aktif</span>
        </>
    );

    return (
        <>
            <div className="mb-3">
                <Table
                    title={activeTitle}
                    data={enabledKonteksSasaran}
                    columns={enabledColumns}
                />
            </div>

            <div>
                <Table
                    title={nonActiveTitle}
                    data={disabledKonteksSasaran}
                    columns={disabledColumns}
                />
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedKonteksSasaran && (
                        <>
                            <p>Yakin ingin menghapus Konteks Sasaran ini?</p>
                            <strong>Kode:</strong> {selectedKonteksSasaran.kode}<br />
                            <strong>Nama:</strong> {selectedKonteksSasaran.nama}<br />
                            <strong>Nama KLP:</strong> {selectedKonteksSasaran.nama_klp}<br />
                            <strong>Total Indikator:</strong> {selectedKonteksSasaran.total_indikator}<br />
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light-secondary" onClick={() => setShowModal(false)}>
                        Batal
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Hapus
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default KonteksSasaranTabel;
