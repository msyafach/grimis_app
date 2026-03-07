import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from "react-router-dom";
import axios from 'axios';
import PropTypes from 'prop-types';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import SelectDropdownSkorKemungkinan from '@/components/shared/SelectDropdownSkorKemungkinan';
import SelectDropdownSkorDampak from '@/components/shared/SelectDropdownSkorDampak';
import SelectDropdownCustom from '@/components/shared/SelectDropdownCustom';
import { skorColorMap, getLevelBadgeClass } from '@/utils/color';
import { showToast } from '@/utils/toast';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from "../../context/IndukUnitKerjaContext";
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { validateIds } from '@/utils/validateIds';

// Add these endpoints to your API_ENDPOINTS config file if they don't exist
if (!API_ENDPOINTS.getKriteriaRisikoKemungkinanById) {
    API_ENDPOINTS.getKriteriaRisikoKemungkinanById = (id) => 
        `${API_ENDPOINTS.baseUrl}/kriteria-kemungkinan/${id}`;
}

if (!API_ENDPOINTS.getKriteriaRisikoDampakById) {
    API_ENDPOINTS.getKriteriaRisikoDampakById = (id) => 
        `${API_ENDPOINTS.baseUrl}/kriteria-dampak/${id}`;
}

const TreatedRiskEditContent = ({ title = "Skor / Nilai Treated Risk" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { state } = useLocation();
    const { identifikasiId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja, idTemplate } = useIndukUnitKerja();

    // Ambil analisisId dari state, atau dari sessionStorage sebagai fallback
    const stateAnalisisId = state?.analisisId;
    const [analisisId, setAnalisisId] = useState(stateAnalisisId || sessionStorage.getItem(`analisisId_${identifikasiId}`));

    const [identifikasi, setIdentifikasi] = useState({});
    const [treated, setTreated] = useState(null);
    const [kemungkinan, setKemungkinan] = useState([]);
    const [dampak, setDampak] = useState([]);
    const [kategoriFrekuensi, setKategoriFrekuensi] = useState([]);
    const [kategoriDampak, setKategoriDampak] = useState([]);
    const [matriksData, setMatriksData] = useState([]);
    const [skorFrekuensiData, setSkorFrekuensiData] = useState([]);
    const [skorDampakData, setSkorDampakData] = useState([]);

    const [selectedKemungkinan, setSelectedKemungkinan] = useState(null);
    const [selectedDampak, setSelectedDampak] = useState(null);
    const [selectedSkorKemungkinan, setSelectedSkorKemungkinan] = useState(null);
    const [selectedSkorDampak, setSelectedSkorDampak] = useState(null);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    // Validasi dan simpan analisisId saat komponen dimount
    useEffect(() => {
        if (stateAnalisisId) {
            sessionStorage.setItem(`analisisId_${identifikasiId}`, stateAnalisisId);
        } else if (!analisisId) {
            // Jika tidak ada analisisId di state maupun storage, cari dari API
            const fetchAnalisisId = async () => {
                try {
                    const token = localStorage.getItem('access_token');
                    const headers = { Authorization: `Bearer ${token}` };
                    const response = await axios.get(
                        API_ENDPOINTS.getAnalisisRisikoByIdentifikasiRisikoId(identifikasiId),
                        { headers }
                    );
                    
                    if (response.data && response.data.length > 0) {
                        const fetchedAnalisisId = response.data[0].id;
                        setAnalisisId(fetchedAnalisisId);
                        sessionStorage.setItem(`analisisId_${identifikasiId}`, fetchedAnalisisId);
                    } else {
                        showToast("error", "Tidak dapat menemukan analisis risiko untuk identifikasi ini");
                        navigate(-1);
                    }
                } catch (error) {
                    console.error("Error fetching analisis ID:", error);
                    showToast("error", "Terjadi kesalahan saat mengambil data analisis risiko");
                    navigate(-1);
                }
            };
            
            fetchAnalisisId();
        }
    }, [stateAnalisisId, identifikasiId, navigate]);

    // Redirect jika analisisId masih tidak tersedia setelah semua usaha
    useEffect(() => {
        if (!loading && !analisisId) {
            showToast("error", "ID Analisis Risiko tidak ditemukan");
            navigate(-1);
        }
    }, [loading, analisisId, navigate]);

    // Function to get kriteria details by ID
    const getKriteriaById = async (kriteriaId, jenis) => {
        if (!kriteriaId) return null;
        
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            let apiEndpoint;
            
            if (jenis === "KEMUNGKINAN") {
                apiEndpoint = API_ENDPOINTS.getKriteriaRisikoKemungkinanById(kriteriaId);
            } else {
                apiEndpoint = API_ENDPOINTS.getKriteriaRisikoDampakById(kriteriaId);
            }
            
            const response = await axios.get(apiEndpoint, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${jenis} criteria:`, error);
            
            // If API doesn't return criteria details, try to find it in local state
            if (jenis === "KEMUNGKINAN") {
                const localKriteria = kemungkinan.find(k => k.id === kriteriaId);
                if (localKriteria) {
                    return localKriteria;
                }
            } else {
                const localKriteria = dampak.find(d => d.id === kriteriaId);
                if (localKriteria) {
                    return localKriteria;
                }
            }
            
            return null;
        }
    };

    // Function to update score options based on selected criteria
    const updateScoreOptions = useCallback(async (kriteriaId, jenis) => {
        if (!kriteriaId || !matriksData.length) {
            return;
        }
        
        try {
            const kriteria = await getKriteriaById(kriteriaId, jenis);
            if (!kriteria) {
                return;
            }
            
            // Use nilai as classification
            const klasifikasi = kriteria.nilai || 1; 
            
            // Get all matrix entries for this type
            const allMatrixEntriesForType = matriksData.filter(item => 
                item.jenis === (jenis === "KEMUNGKINAN" ? "FREKUENSI" : "DAMPAK")
            );
            
            // Try to find matrix values for the specific classification
            let matriksFiltered = matriksData.filter(item => 
                item.jenis === (jenis === "KEMUNGKINAN" ? "FREKUENSI" : "DAMPAK") && 
                parseInt(item.klasifikasi) === parseInt(klasifikasi)
            );
            
            // If no entries found for this classification, try using classification 1 as fallback
            if (matriksFiltered.length === 0) {
                matriksFiltered = matriksData.filter(item => 
                    item.jenis === (jenis === "KEMUNGKINAN" ? "FREKUENSI" : "DAMPAK") && 
                    parseInt(item.klasifikasi) === 1
                );
                
                // If still no entries, just use all entries for this type
                if (matriksFiltered.length === 0) {
                    matriksFiltered = allMatrixEntriesForType;
                }
            }
            
            if (jenis === "KEMUNGKINAN") {
                // Update kemungkinan score options
                const newSkorFrekuensiOptions = skorFrekuensiData
                    .sort((a, b) => a.key - b.key)
                    .map((item) => {
                        // Find all matching entries for this score
                        const matchingEntries = matriksFiltered.filter(m => 
                            parseInt(m.kategori) === parseInt(item.key)
                        );
                        
                        // Use the first matching entry or default
                        const persen = matchingEntries.length > 0 ? matchingEntries[0].value : '-';
                        
                        return {
                            value: item.key,
                            label: item.value,
                            color: skorColorMap[item.key] || 'bg-secondary',
                            persentase: persen
                        };
                    });
                
                setKategoriFrekuensi(newSkorFrekuensiOptions);
                
                // Reset selected score if needed
                if (selectedSkorKemungkinan) {
                    const matchingOption = newSkorFrekuensiOptions.find(
                        option => parseInt(option.value) === parseInt(selectedSkorKemungkinan.value)
                    );
                    if (matchingOption) {
                        setSelectedSkorKemungkinan(matchingOption);
                    } else {
                        // Select first option if previous selection is no longer valid
                        if (newSkorFrekuensiOptions.length > 0) {
                            setSelectedSkorKemungkinan(newSkorFrekuensiOptions[0]);
                        }
                    }
                } else if (newSkorFrekuensiOptions.length > 0) {
                    // If no selection, select first option
                    setSelectedSkorKemungkinan(newSkorFrekuensiOptions[0]);
                }
            } else {
                // Update dampak score options
                const newSkorDampakOptions = skorDampakData
                    .sort((a, b) => a.key - b.key)
                    .map((item) => {
                        // Find all matching entries for this score
                        const matchingEntries = matriksFiltered.filter(m => 
                            parseInt(m.kategori) === parseInt(item.key)
                        );
                        
                        // Use the first matching entry or default
                        const persen = matchingEntries.length > 0 ? matchingEntries[0].value : '-';
                        
                        return {
                            value: item.key,
                            label: item.value,
                            color: skorColorMap[item.key] || 'bg-secondary',
                            persentase: persen
                        };
                    });
                
                setKategoriDampak(newSkorDampakOptions);
                
                // Reset selected score if needed
                if (selectedSkorDampak) {
                    const matchingOption = newSkorDampakOptions.find(
                        option => parseInt(option.value) === parseInt(selectedSkorDampak.value)
                    );
                    if (matchingOption) {
                        setSelectedSkorDampak(matchingOption);
                    } else {
                        // Select first option if previous selection is no longer valid
                        if (newSkorDampakOptions.length > 0) {
                            setSelectedSkorDampak(newSkorDampakOptions[0]);
                        }
                    }
                } else if (newSkorDampakOptions.length > 0) {
                    // If no selection, select first option
                    setSelectedSkorDampak(newSkorDampakOptions[0]);
                }
            }
        } catch (error) {
            console.error(`Error updating score options for ${jenis}:`, error);
        }
    }, [matriksData, skorFrekuensiData, skorDampakData, selectedSkorKemungkinan, selectedSkorDampak, kemungkinan, dampak]);

    // Handle changing kemungkinan kriteria
    const handleKemungkinanChange = (option) => {
        setSelectedKemungkinan(option);
        updateScoreOptions(option.value, "KEMUNGKINAN");
    };

    // Handle changing dampak kriteria
    const handleDampakChange = (option) => {
        setSelectedDampak(option);
        updateScoreOptions(option.value, "DAMPAK");
    };

    const fetchAllData = useCallback(async () => {
        if (!analisisId) return;
        
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
            if (!validationResult.valid) {
                showToast("error", validationResult.message);
                return;
            }

            const [indentifikasiRes, kemungkinanRes, dampakRes, treatedRes, skorFreqRes, skorDampakRes, matriksRes] = await Promise.all([
                axios.get(API_ENDPOINTS.getIdentifikasiRisikoById(identifikasiId), { headers }),
                axios.get(API_ENDPOINTS.getKriteriaRisikoKemungkinanByIndukUnitKerja(idInstansi, idIndukUnitKerja), { headers }),
                axios.get(API_ENDPOINTS.getKriteriaRisikoDampakByIndukUnitKerja(idInstansi, idIndukUnitKerja), { headers }),
                axios.get(API_ENDPOINTS.getAnalisisRisikoTreated(analisisId), { headers }),
                axios.get(API_ENDPOINTS.getPetaKategoriFrekuensi(idTemplate), { headers }),
                axios.get(API_ENDPOINTS.getPetaKategoriDampak(idTemplate), { headers }),
                axios.get(API_ENDPOINTS.getPetaMatriks(idTemplate), { headers }),
            ]);
            setIdentifikasi(indentifikasiRes.data);
            setKemungkinan(kemungkinanRes.data);
            setDampak(dampakRes.data);
            setMatriksData(matriksRes.data);
            setSkorFrekuensiData(skorFreqRes.data);
            setSkorDampakData(skorDampakRes.data);
            
            setSelectedKemungkinan({
                label: kemungkinanRes.data.find(k => k.id === treatedRes.data.kemungkinan_id)?.deskripsi || '',
                value: treatedRes.data.kemungkinan_id
            });
            setSelectedDampak({
                label: dampakRes.data.find(d => d.id === treatedRes.data.dampak_id)?.deskripsi || '',
                value: treatedRes.data.dampak_id
            });

            // Find kriteria details directly from the arrays we already have
            const kemungkinanKriteria = kemungkinanRes.data.find(
                k => k.id === treatedRes.data.kemungkinan_id
            );
            const dampakKriteria = dampakRes.data.find(
                d => d.id === treatedRes.data.dampak_id
            );
            
            // Filter matrix values based on criteria's classification
            const kemungkinanKlasifikasi = kemungkinanKriteria?.nilai || 1;
            const dampakKlasifikasi = dampakKriteria?.nilai || 1;
            
            const matriksKemungkinan = matriksRes.data.filter(item =>
                item.jenis === "FREKUENSI" && parseInt(item.klasifikasi) === parseInt(kemungkinanKlasifikasi)
            );
            
            const matriksDampak = matriksRes.data.filter(item =>
                item.jenis === "DAMPAK" && parseInt(item.klasifikasi) === parseInt(dampakKlasifikasi)
            );

            const persentaseKemungkinan = matriksKemungkinan.find(item =>
                parseInt(item.kategori) === parseInt(treatedRes.data.skor_kemungkinan)
            )?.value;

            const skorFrekuensiOptions = skorFreqRes.data
                .sort((a, b) => a.key - b.key)
                .map((item) => {
                    const persen = matriksKemungkinan.find(m =>
                        parseInt(m.kategori) === parseInt(item.key)
                    )?.value || '-';
                    return {
                        value: item.key,
                        label: item.value,
                        color: skorColorMap[item.key] || 'bg-secondary',
                        persentase: persen,
                    };
                });
            const skorDampakOptions = skorDampakRes.data
                .sort((a, b) => a.key - b.key)
                .map((item) => {
                    const persen = matriksDampak.find(m =>
                        parseInt(m.kategori) === parseInt(item.key)
                    )?.value || '-';
                    return {
                        value: item.key,
                        label: item.value,
                        color: skorColorMap[item.key] || 'bg-secondary',
                        persentase: persen
                    };
                });
            setKategoriFrekuensi(skorFrekuensiOptions);
            setKategoriDampak(skorDampakOptions);

            setSelectedSkorKemungkinan({
                value: treatedRes.data.skor_kemungkinan,
                label: skorFreqRes.data.find(item => parseInt(item.key) === parseInt(treatedRes.data.skor_kemungkinan))?.value || '',
                color: skorColorMap[treatedRes.data.skor_kemungkinan] || 'bg-secondary',
                persentase: persentaseKemungkinan || ''
            });

            const persentaseDampak = matriksDampak.find(item =>
                parseInt(item.kategori) === parseInt(treatedRes.data.skor_dampak)
            )?.value;

            setSelectedSkorDampak({
                value: treatedRes.data.skor_dampak,
                label: skorDampakRes.data.find(item => parseInt(item.key) === parseInt(treatedRes.data.skor_dampak))?.value || '',
                color: skorColorMap[treatedRes.data.skor_dampak] || 'bg-secondary',
                persentase: persentaseDampak || ''
            });

            setTreated(treatedRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
            setErrorMessage("Gagal mengambil data. " + (error.response?.data?.detail || ""));
        } finally {
            setLoading(false);
        }
    }, [identifikasiId, idInstansi, idIndukUnitKerja, analisisId, idTemplate]);

    useEffect(() => {
        if (analisisId) {
            fetchAllData();
        }
    }, [fetchAllData, analisisId]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!analisisId) {
            showToast("error", "ID Analisis Risiko tidak ditemukan. Silahkan kembali ke halaman sebelumnya.");
            return;
        }
        
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
            if (!validationResult.valid) {
                showToast("error", validationResult.message);
                return;
            }

            await axios.put(API_ENDPOINTS.putAnalisisRisikoTreated(analisisId), {
                skor_kemungkinan: selectedSkorKemungkinan?.value || 0,
                skor_dampak: selectedSkorDampak?.value || 0,
                kemungkinan_id: selectedKemungkinan?.value || '',
                dampak_id: selectedDampak?.value || '',
            }, { headers });
            await fetchAllData();
            showToast("success", "Treated Risk Berhasil Diubah!")
        } catch (error) {
            console.error("Error updating treated risk:", error);
            const errorMsg = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            setErrorMessage(errorMsg);
            showToast("error", errorMsg);
        }
    };

    if (isRemoved) return null;

    const level = treated?.level_risiko || 0;
    const badgeClass = getLevelBadgeClass(level);

    return (
        <div className="card stretch stretch-full">
            <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
            <div className="card-body">
                <ContentLoaderWrapper loading={loading} error={errorMessage}>
                    {!analisisId && !loading ? (
                        <div className="alert alert-danger">
                            ID Analisis Risiko tidak ditemukan. Silahkan kembali ke halaman sebelumnya.
                        </div>
                    ) : (
                        <>
                            <div className="row">
                                <div className="col-12">
                                    <h5 className="fw-bold">{identifikasi?.pernyataan_risiko}</h5>
                                    <p>{identifikasi?.deskripsi}</p>
                                </div>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="form-label">Kriteria Kemungkinan</label>
                                    <SelectDropdownCustom
                                        options={kemungkinan.map((item) => ({
                                            label: item.deskripsi,
                                            value: String(item.id),
                                        }))}
                                        selectedOption={selectedKemungkinan}
                                        onSelectOption={handleKemungkinanChange}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label">Skor Kemungkinan</label>
                                    <SelectDropdownSkorKemungkinan
                                        options={kategoriFrekuensi}
                                        selectedOption={selectedSkorKemungkinan}
                                        onSelectOption={setSelectedSkorKemungkinan}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label">Kriteria Dampak</label>
                                    <SelectDropdownCustom
                                        options={dampak.map((item) => ({
                                            label: item.deskripsi,
                                            value: String(item.id),
                                        }))}
                                        selectedOption={selectedDampak}
                                        onSelectOption={handleDampakChange}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label">Skor Dampak</label>
                                    <SelectDropdownSkorDampak
                                        options={kategoriDampak}
                                        selectedOption={selectedSkorDampak}
                                        onSelectOption={setSelectedSkorDampak}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label">Level Risiko</label><br />
                                    <span className={`badge ${badgeClass} rounded-4 py-2 px-2 fs-5 w-25 text-center`}>
                                        {level}
                                    </span>
                                </div>
                                <div className="d-flex justify-content-end gap-2">
                                    <button type="button" className="btn bg-soft-danger text-danger" onClick={() => navigate(-1)}>
                                        <FiArrowLeft size={16} className="me-2" />Kembali
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        <FiSave size={16} className="me-2" />Simpan Perubahan
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </ContentLoaderWrapper>
            </div>
        </div>
    );
};

TreatedRiskEditContent.propTypes = {
    title: PropTypes.string,
};

export default TreatedRiskEditContent;
