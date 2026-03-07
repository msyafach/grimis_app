import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useInstansi } from '../../../context/InstansiContext';
import { useIndukUnitKerja } from '../../../context/IndukUnitKerjaContext';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useTahun } from '../../../context/TahunContext';
import API_ENDPOINTS from '../../../config/apiConfig';
import { showToast } from '@/utils/toast';

const InstansiModal = () => {
    const navigate = useNavigate();
    const { idInstansi, setIdInstansi } = useInstansi();
    const { updateIndukUnitKerjaByInstansi, setIdIndukUnitKerja, setIdTemplate } = useIndukUnitKerja();
    const { fetchAvailableYears, setTahunId } = useTahun();
    const { setLoadingRedirect, setLoadingMessage } = useAppLoading();
    const [instansiList, setInstansiList] = useState([]);
    const [selectedInstansi, setSelectedInstansi] = useState(null);

    useEffect(() => {
        const fetchInstansi = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(API_ENDPOINTS.getInstansi, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const data = response.data;

                if (Array.isArray(data)) {
                    setInstansiList(data);
                    // Verifikasi bahwa idInstansi masih ada dalam daftar
                    const selected = data.find(inst => inst.id === idInstansi);
                    if (selected) {
                        setSelectedInstansi(selected);
                    } else if (data.length > 0) {
                        // Jika idInstansi tidak ditemukan, gunakan instansi pertama
                        setSelectedInstansi(data[0]);
                        // Update idInstansi ke instansi pertama
                        setIdInstansi(data[0].id);
                        localStorage.setItem('id_instansi', data[0].id);
                    }
                } else {
                    console.error("Data instansi tidak valid:", data);
                }
            } catch (error) {
                console.error("Gagal mengambil data instansi:", error);
            }
        };

        fetchInstansi();
    }, [idInstansi, setIdInstansi]);

    const handleInstansiSelect = async (instansi) => {
        console.log("Selected Instansi:", instansi);
        if (instansi.id === selectedInstansi?.id) {
            setLoadingMessage('Mengganti Instansi...');
            setLoadingRedirect(true);
            navigate('/')
            return;
        }

        // Verifikasi instansi masih ada di database
        try {
            const token = localStorage.getItem('access_token');
            await axios.get(API_ENDPOINTS.getInstansiById(instansi.id), {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Instansi tidak ditemukan di database:", err);
            showToast('error', 'Instansi tidak ditemukan di database');
            // Refresh daftar instansi
            const token = localStorage.getItem('access_token');
            try {
                const response = await axios.get(API_ENDPOINTS.getInstansi, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (Array.isArray(response.data)) {
                    setInstansiList(response.data);
                }
            } catch (error) {
                console.error("Gagal memperbarui daftar instansi:", error);
            }
            return;
        }

        localStorage.removeItem('dashboard_error');
        localStorage.removeItem('id_induk_unit_kerja');
        localStorage.removeItem('id_template');
        localStorage.removeItem('tahun');

        setSelectedInstansi(instansi);
        setIdInstansi(instansi.id);
        setIdTemplate('');
        setIdIndukUnitKerja('');
        setTahunId(null);

        const tahunResult = await fetchAvailableYears();
        const indukResult = await updateIndukUnitKerjaByInstansi(instansi.id);

        if (indukResult.success) {
            try {
                const token = localStorage.getItem('access_token');
                const newIndukUnitId = localStorage.getItem('id_induk_unit_kerja');
                await axios.put(
                    API_ENDPOINTS.putUserPreferences(instansi.id, newIndukUnitId),
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log("Berhasil menyimpan preferensi user setelah ganti instansi");
            } catch (err) {
                console.error("Gagal menyimpan preferensi user setelah ganti instansi:", err.response?.data || err.message);
            }
        }

        if (!tahunResult) {
            localStorage.setItem('dashboard_error', "Tidak ada data tahun tersedia.");
        } else if (!indukResult.success) {
            localStorage.setItem('dashboard_error', indukResult.message || "Induk unit kerja atau template belum tersedia.");
        } else {
            localStorage.removeItem('dashboard_error');
        }
        setLoadingMessage('Mengganti Instansi...');
        setTimeout(() => {
            setLoadingRedirect(true);
            navigate('/');
            // Reload agar semua komponen baca ulang localStorage/context
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }, 400);
    };

    return (
        <div className="dropdown nxl-h-item">
            <button
                type="button"
                className="nxl-navigation-toggle me-3 btn btn-light text-dark border border-dark rounded-pill"
                data-bs-toggle="dropdown"
                role="button"
                data-bs-auto-close="outside"
            >
                <span>{selectedInstansi?.nama_instansi || instansiList[0]?.nama_instansi || 'Pilih Instansi'}</span>
            </button>
            <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown">
                <h6 className="fw-bold text-dark mb-2 px-3">Pilih Instansi</h6>
                <div className="company-list">
                    {instansiList.length > 0 ? (
                        instansiList.map((instansi) => (
                            <Link
                                key={instansi.id}
                                to="#"
                                className={`dropdown-item text-wrap text-break ${selectedInstansi?.id === instansi.id ? 'active' : ''}`}
                                onClick={() => handleInstansiSelect(instansi)}
                            >
                                {instansi.nama_instansi}
                            </Link>
                        ))
                    ) : (
                        <span className="text-muted px-3">Tidak ada data instansi</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstansiModal;
