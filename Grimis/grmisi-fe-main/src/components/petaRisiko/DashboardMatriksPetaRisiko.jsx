import { useEffect, useState, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import { FiRefreshCcw, FiSettings, FiCheckCircle } from 'react-icons/fi';
import { Card, Table, Modal, Button } from "react-bootstrap";
import SelectDropdown from '@/components/shared/SelectDropdown';
import { showToast } from "@/utils/toast";
import { useInstansi } from '../../context/InstansiContext';
import { useTahun } from '../../context/TahunContext';
import { useIndukUnitKerja } from "../../context/IndukUnitKerjaContext";
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { validateInstansiId, validateIndukUnitKerjaId, validateIds } from '@/utils/validateIds';
import { useAuth } from "../../context/AuthContext";

// Add custom styles
const styles = {
    hoverHighlight: {
        transition: 'background-color 0.2s',
    },
    tableRow: {
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
    },
    tableRowHover: {
        backgroundColor: '#f0f7ff',
    }
};

const DashboardMatriksPetaRisiko = () => {
    const navigate = useNavigate();
    const { idInstansi, setIdInstansi } = useInstansi();
    const { tahunId } = useTahun();
    const { idIndukUnitKerja, setIdIndukUnitKerja, idTemplate, setIdTemplate } = useIndukUnitKerja();
    const [currentSelera, setCurrentSelera] = useState(0);
    const [seleraOptions, setSeleraOptions] = useState([]);
    const [frekuensi, setFrekuensi] = useState([]);
    const [dampak, setDampak] = useState([]);
    const [kategoriFrekuensi, setKategoriFrekuensi] = useState([]);
    const [kategoriDampak, setKategoriDampak] = useState([]);
    const [metaHeatmap, setMetaHeatmap] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [storedError, setStoredError] = useState('');
    const [generateError, setGenerateError] = useState('');
    const { user } = useAuth();
    const isAdminOrganisasi = user?.role === "ADMIN_KLP";
    const isPemilikRisiko = user?.role === "PEMILIK_RISIKO";
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const canEditSeleraRisiko = isAdminOrganisasi || isPemilikRisiko || isSuperAdmin;

    const token = localStorage.getItem('access_token');

    // Function to trigger dashboard stats refresh
    const triggerDashboardRefresh = () => {
        console.log('Triggering dashboard refresh event');
        window.dispatchEvent(new Event('dashboard-refresh'));
    };

    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            setLoadingMessage("Memuat data peta risiko ...");

            const userRes = await axios.get(API_ENDPOINTS.getCurrentUser, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const user = userRes.data;
            localStorage.setItem('user_role', user.role);

            const instansiIdToUse = idInstansi || user.last_instansi_id;
            const indukUnitKerjaIdToUse = idIndukUnitKerja || user.last_induk_unit_kerja_id;

            // Validasi ID menggunakan utility validateIds
            const validationResult = await validateIds(instansiIdToUse, indukUnitKerjaIdToUse, token);
            if (!validationResult.valid) {
                setStoredError(validationResult.message);
                setLoading(false);
                return;
            }

            // Validasi tahun
            if (!tahunId) {
                setStoredError("Tidak ada data tahun tersedia.");
                setLoading(false);
                return;
            }

            // Update preferensi pengguna setelah validasi
            try {
                await axios.put(
                    API_ENDPOINTS.putUserPreferences(instansiIdToUse, indukUnitKerjaIdToUse),
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } catch (err) {
                console.error("Gagal memperbarui preferensi pengguna:", err.response?.data || err.message);
                // Lanjutkan meskipun gagal update preferensi
            }

            const [dampakRes, kemungkinanRes, petaRes] = await Promise.all([
                axios.get(API_ENDPOINTS.getKriteriaRisikoDampakByIndukUnitKerja(instansiIdToUse, indukUnitKerjaIdToUse), {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(API_ENDPOINTS.getKriteriaRisikoKemungkinanByIndukUnitKerja(instansiIdToUse, indukUnitKerjaIdToUse), {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(API_ENDPOINTS.getPetaView(tahunId, instansiIdToUse, indukUnitKerjaIdToUse), {
                    headers: { Authorization: `Bearer ${token}` },
                })
            ]);

            setDampak(dampakRes.data);
            setFrekuensi(kemungkinanRes.data)

            const petaData = petaRes.data;

            if (petaData.template === null) {
                setStoredError("Template belum tersedia untuk unit kerja ini.");
                return;
            }

            if (Array.isArray(petaData.kategori_frekuensi) &&
                Array.isArray(petaData.kategori_dampak) &&
                Array.isArray(petaData.meta_heatmap)) {
                setKategoriFrekuensi(petaData.kategori_frekuensi.sort((a, b) => Number(a.key) - Number(b.key)));
                setKategoriDampak(petaData.kategori_dampak.sort((a, b) => Number(a.key) - Number(b.key)));
                setMetaHeatmap(petaData.meta_heatmap);
            }

            const templateId = petaData.template?.id || petaData?.id;
            setIdTemplate(templateId);
            localStorage.setItem('id_template', templateId);

            const seleraRisiko = petaData.template.selera_risiko;
            if (seleraRisiko && typeof seleraRisiko.max === 'number') {
                const options = Array.from({ length: seleraRisiko.max }, (_, i) => ({
                    label: String(i + 1),
                    value: i + 1
                }));
                setSeleraOptions(options);

                if (typeof seleraRisiko.current === 'number') {
                    setCurrentSelera({
                        label: String(seleraRisiko.current),
                        value: seleraRisiko.current
                    });
                }
            }

            // Trigger dashboard stats refresh since peta risiko is loaded
            triggerDashboardRefresh();
        } catch (error) {
            if (import.meta.env.MODE === 'development') {
                console.warn('[Dev] Gagal memuat data awal:', error);
            }
            setErrorMessage("Terjadi kesalahan saat mengambil data.");
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    }, [token, idInstansi, idIndukUnitKerja, tahunId, setIdTemplate]);

    useEffect(() => {
        if (!token || !tahunId || storedError) return;
        if (storedError) return;
        fetchAllData();
    }, [fetchAllData, storedError, tahunId, token, idIndukUnitKerja, idInstansi]);

    useEffect(() => {
        const localErr = localStorage.getItem('dashboard_error');
        if (localErr) {
            setStoredError(localErr);
            localStorage.removeItem('dashboard_error');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!loading && kategoriDampak.length && kategoriFrekuensi.length) {
            localStorage.removeItem('dashboard_error');
            setStoredError('');
        }
    }, [loading, kategoriDampak, kategoriFrekuensi]);

    const handleSeleraChange = async (option) => {
        setLoading(true);
        setLoadingMessage("Memperbarui selera risiko...");
        try {
            const token = localStorage.getItem('access_token');
            await axios.put(
                API_ENDPOINTS.putPetaTemplateSelera(idTemplate, option.value),
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setCurrentSelera(option);
            showToast("success", "Selera risiko berhasil diperbarui!");
            
            // Refetch data to update the map and trigger dashboard refresh
            await fetchAllData();
            triggerDashboardRefresh();
        } catch (err) {
            if (import.meta.env.MODE === 'development') {
                console.error("Gagal update selera risiko:", err);
            }
            showToast("error", "Gagal memperbarui selera risiko.");
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const createDefaultKategoriRisiko = async (templateId, token) => {
        const createKategori = async (jenis) => {
            const requests = Array.from({ length: 5 }, (_, i) =>
                axios.post(
                    API_ENDPOINTS.postPetaKategori(templateId),
                    {
                        key: i + 1,
                        value: "",
                        jenis,
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                )
            );
            await Promise.all(requests);
        };

        await Promise.all([
            createKategori("FREKUENSI"),
            createKategori("DAMPAK"),
        ]);
    };

    const handleGenerateTemplate = async () => {
        setLoading(true);
        setLoadingMessage("Generating template...");
        setErrorMessage('');

        try {
            const token = localStorage.getItem('access_token');
            const res = await axios.post(API_ENDPOINTS.postPetaTemplate(tahunId, idInstansi, idIndukUnitKerja), {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newTemplate = Array.isArray(res.data)
                ? res.data[0]
                : res.data?.data?.[0] || res.data;

            if (newTemplate?.id) {
                setIdTemplate(newTemplate.id);
                localStorage.setItem('id_template', newTemplate.id);
                // await createDefaultKategoriRisiko(newTemplate.id, token);
            }

            // Bersihkan stored error dan refresh data
            localStorage.removeItem('dashboard_error');
            setStoredError('');
            
            // Trigger refreshes
            await fetchAllData();
            triggerDashboardRefresh();
            
            showToast("success", "Template berhasil dibuat!");
        } catch (err) {
            const message = err?.response?.data?.detail || "Gagal generate template.";
            setGenerateError(message);
            showToast("error", message);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    // New function to handle cell click
    const handleCellClick = async (heat) => {
        if (!heat) return;

        try {
            setLoading(true);
            setLoadingMessage("Memuat data risiko...");

            // Validasi instansi dan induk unit kerja sebelum mengambil data risiko
            if (!idInstansi) {
                showToast("error", "Instansi belum dipilih");
                setLoading(false);
                return;
            }

            if (!idIndukUnitKerja) {
                showToast("error", "Induk unit kerja belum dipilih");
                setLoading(false);
                return;
            }

            if (!tahunId) {
                showToast("error", "Tahun belum dipilih");
                setLoading(false);
                return;
            }

            // Validasi bahwa instansi dan induk unit kerja ada di database
            try {
                await Promise.all([
                    axios.get(API_ENDPOINTS.getInstansiById(idInstansi), {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(API_ENDPOINTS.getIndukUnitKerjaById(idIndukUnitKerja), {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
            } catch (err) {
                console.error("ID tidak valid:", err);
                showToast("error", "Instansi atau induk unit kerja tidak ditemukan");
                setLoading(false);
                return;
            }

            const response = await axios.get(API_ENDPOINTS.getPetaRisksByCell(tahunId, heat.frekuensi, heat.dampak, idInstansi, idIndukUnitKerja), {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.length > 0) {
                // Navigate to identifikasi risiko page with filter parameters
                navigate(`/pengelolaan-risiko/identifikasi-risiko?frekuensi=${heat.frekuensi}&dampak=${heat.dampak}`);
            } else {
                showToast("info", "Tidak ada risiko pada sel ini");
            }
        } catch (error) {
            console.error("Error fetching cell risks:", error);
            showToast("error", "Gagal memuat data risiko");
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    if (loading) {
        return <ContentLoaderWrapper loading={loading} message={loadingMessage} error={errorMessage} />;
    }

    if (storedError) {
        if (storedError === "Tidak ada data tahun tersedia.") {
            return (
                <div className="alert alert-danger text-center rounded-4">
                    <strong>{storedError}</strong>
                    <ul className="text-start mt-2">
                        <li>Silakan isi data pengelolaan risiko terlebih dahulu untuk tahun ini.</li>
                    </ul>
                </div>
            );
        } else if (storedError === "Template belum tersedia untuk unit kerja ini.") {
            const isDataReady = frekuensi.length > 0 && dampak.length > 0;
            return (
                <div className={`alert ${isDataReady ? 'alert-success' : 'alert-warning'} text-center rounded-4`}>
                    <strong>{storedError}</strong>
                    <ul className="text-start mt-2">
                        {isDataReady ? (
                            <>
                                <li><strong>Kategori kemungkinan</strong> dan <strong>kategori dampak</strong> sudah tersedia.</li>
                                <li>Anda dapat membuat template baru sekarang.</li>
                            </>
                        ) : (
                            <>
                                <li><strong>Kriteria kemungkinan</strong> harus dibuat untuk unit kerja ini.</li>
                                <li><strong>Kriteria dampak</strong> juga harus tersedia.</li>
                            </>
                        )}
                    </ul>
                    {isDataReady && (
                        <button className="btn btn-primary mt-3" onClick={handleGenerateTemplate}>
                            <FiRefreshCcw size={16} className="me-2" /> Generate Template
                        </button>
                    )}
                </div>
            );
        } else {
            return (
                <div className="alert alert-warning text-center rounded-4">
                    <strong>{storedError}</strong>
                </div>
            );
        }
    }


    return (
        <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Peta Risiko</h5>
                <div className="d-flex align-items-center gap-2 ms-auto">
                    {canEditSeleraRisiko && (
                        <>
                            <span className="fw-semibold">Selera Risiko:</span>
                            <SelectDropdown
                                options={seleraOptions}
                                selectedOption={currentSelera}
                                onSelectOption={handleSeleraChange}
                                placeholder="Selera Risiko"
                            />
                        </>
                    )}
                    {canEditSeleraRisiko && (
                        <button
                            className="btn bg-primary text-white"
                            type="button"
                            onClick={() => navigate('/peta-risiko/setting')}
                        >
                            <FiSettings size={16} />
                        </button>
                    )}
                </div>
            </Card.Header>
            <Card.Body style={{ overflowX: "auto" }}>
                <div style={{ overflowX: 'auto' }}>
                    <Table bordered hover className="w-100 text-center align-middle" style={{ minWidth: '1000px' }}>
                        <colgroup>
                            {[
                                <col key="label" style={{ width: '3%' }} />,
                                <col key="key" style={{ width: '3%' }} />,
                                <col key="value" style={{ width: '12%' }} />,
                                ...kategoriDampak.map((_, index) => (
                                    <col key={`col-${index}`} style={{ width: `${82 / kategoriDampak.length}%` }} />
                                ))
                            ]}
                        </colgroup>

                        <thead>
                            <tr>
                                <th rowSpan="3" colSpan="3" className="align-middle fw-semibold">Peta Risiko</th>
                                <th colSpan={kategoriDampak.length} className="align-middle fw-semibold">Dampak</th>
                            </tr>
                            <tr>
                                {kategoriDampak.map((item) => (
                                    <th key={`k-${item.key}`} className="fw-semibold" style={{ whiteSpace: "normal" }}>
                                        {item.key}
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                {kategoriDampak.map((d) => (
                                    <th key={`d-key-${d.key}`} className="fw-semibold" style={{ whiteSpace: "normal" }}>
                                        {d.value}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {kategoriFrekuensi.slice().reverse().map((f, index) => (
                                <tr key={f.key}>
                                    {index === 0 && (
                                        <td
                                            rowSpan={kategoriFrekuensi.length}
                                            className="align-middle fw-bold"
                                            style={{
                                                writingMode: "vertical-rl",
                                                transform: "rotate(180deg)",
                                                textAlign: "center",
                                                whiteSpace: "nowrap"
                                            }}
                                        >
                                            Frekuensi
                                        </td>
                                    )}
                                    <td className="fw-bold">{f.key}</td>
                                    <td className="fw-bold">{f.value}</td>
                                    {kategoriDampak.map((d) => {
                                        const heat = metaHeatmap.find(
                                            (m) => String(m.frekuensi) === String(f.key) && String(m.dampak) === String(d.key)
                                        );
                                        return (
                                            <td
                                                key={`cell-${f.key}-${d.key}`}
                                                className="text-white"
                                                style={{
                                                    backgroundColor: heat?.kode_warna || ((heat?.memenuhi) ? '#00ff44' : '#ff6505'),
                                                    cursor: "pointer",
                                                    borderTop: heat?.atas ? '5px solid #021526' : '1px solid #ddd',
                                                    borderRight: heat?.kanan ? '5px solid #021526' : '1px solid #ddd',
                                                    borderBottom: heat?.bawah ? '5px solid #021526' : '1px solid #ddd',
                                                    borderLeft: heat?.kiri ? '5px solid #021526' : '1px solid #ddd',
                                                    fontWeight: 'bold',
                                                    fontSize: 14,
                                                    position: 'relative'
                                                }}
                                                onClick={() => handleCellClick(heat)}
                                            >
                                                {/* Skor utama (besar) */}
                                                <div style={{
                                                    fontSize: '24px',
                                                    fontWeight: 'bold',
                                                    textAlign: 'center',
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)'
                                                }}>
                                                    {heat?.value_skor || 0}
                                                </div>
                                                {/* Nilai kecil pojok kanan bawah */}
                                                <div style={{
                                                    fontSize: '14px',
                                                    textAlign: 'right',
                                                    position: 'absolute',
                                                    bottom: '5px',
                                                    right: '5px'
                                                }}>
                                                    {heat?.value || "0"}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>

            </Card.Body>
        </Card>
    );
};

export default DashboardMatriksPetaRisiko;
