import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import PropTypes from 'prop-types';
import axios from 'axios';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import { showToast } from '@/utils/toast';
import FormIdentifikasiRisiko from './FormIdentifikasiRisiko';
import PernyataanRisikoModal from './PernyataanRisikoModal';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import { useTahun } from '../../context/TahunContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateIds } from '@/utils/validateIds';

const IdentifikasiRisikoTambahContent = ({ title = 'Tambah Identifikasi Risiko', resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { tahunId } = useTahun();
    const { setGeneratedStatements, generatedStatements, setLoadingGenerate, loadingGenerate } = useOutletContext();

    // Get current year as fallback
    const currentYear = new Date().getFullYear();
    const activeYear = tahunId || currentYear;

    const [strukturOrganisasi, setStrukturOrganisasi] = useState([]);
    const [jenisKonteksSasaran, setJenisKonteksSasaran] = useState([]);
    const [kontekSasaran, setKontekSasaran] = useState([]);
    const [kontekProbis, setKontekProbis] = useState([]);
    const [indikator, setIndikator] = useState([]);
    const [kamus, setKamus] = useState([]);
    const [kategoriRisiko, setKategoriRisiko] = useState([]);

    const [selectedJenisKonteksSasaran, setSelectedJenisKonteksSasaran] = useState(null);
    const [selectedKontekSasaran, setSelectedKontekSasaran] = useState(null);
    const [selectedKontekProbis, setSelectedKontekProbis] = useState(null);
    const [selectedIndikator, setSelectedIndikator] = useState(null);
    const [selectedKamus, setSelectedKamus] = useState(null);
    const [selectedKategoriRisiko, setSelectedKategoriRisiko] = useState(null);
    const [isByAI, setIsByAI] = useState(false);
    const [selectedStatementAI, setSelectedStatementAI] = useState(null);

    const [formData, setFormData] = useState({
        tahun: activeYear,
        id_jenis_konteks_sasaran: '',
        id_konteks_sasaran: '',
        id_konteks_probis: '',
        id_indikator: '',
        id_kategori_risiko: '',
        pernyataan_risiko: '',
        uraian_dampak: '',
        id_instansi: idInstansi,
        id_induk_unit_kerja: idIndukUnitKerja,
        id_bagan_risiko: '',
        id_metode_spip: '',
        deskripsi: '',
        disabled: false,
        disabled_reason: '',
        generation_id: '',
        statement_id: ''
    });

    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                
                // Validasi instansi dan induk unit kerja menggunakan validateIds
                const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
                if (!validationResult.valid) {
                    setErrorMessage(validationResult.message);
                    setLoading(false);
                    return;
                }
                
                const headers = { Authorization: `Bearer ${token}` };

                const strukturRes = await axios.get(API_ENDPOINTS.getStrukturOrganisasi(idInstansi, idIndukUnitKerja), { headers });
                setStrukturOrganisasi(strukturRes.data);

                const filteredSasaran = strukturRes.data.flatMap(item => item.jenis_konteks.filter(k => k.jenis === 'SASARAN'));
                setJenisKonteksSasaran(filteredSasaran);

                const kamusRes = await axios.get(API_ENDPOINTS.getKamusRisikoAll(idInstansi), { headers });
                setKamus(kamusRes.data);

                const kategoriRes = await axios.get(API_ENDPOINTS.getKategoriRisikoAll(idInstansi), { headers });
                setKategoriRisiko(kategoriRes.data);
            } catch (error) {
                console.error('Error fetching data:', error);
                setErrorMessage('Gagal mengambil data.');
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [idIndukUnitKerja, idInstansi]);

    useEffect(() => {
        const filterKonteks = async () => {
            if (!selectedJenisKonteksSasaran) return;

            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };

            try {
                const [sasaranRes, probisRes] = await Promise.all([
                    axios.get(`${API_ENDPOINTS.getKonteksSasaranAll(idInstansi)}&is_disabled=false`, { headers }),
                    axios.get(API_ENDPOINTS.getKonteksProbisAll(idInstansi), { headers }),
                ]);

                const sasaranFiltered = sasaranRes.data.filter(
                    item => item.id_jenis_konteks === selectedJenisKonteksSasaran.value
                );

                const strukturMatch = strukturOrganisasi.find(item =>
                    item.jenis_konteks.some(jk => jk.id === selectedJenisKonteksSasaran.value)
                );

                const probisKonteks = strukturMatch?.jenis_konteks.find(jk => jk.jenis === 'PROBIS');

                const probisFiltered = probisKonteks
                    ? probisRes.data.filter(item => item.id_jenis_konteks === probisKonteks.id)
                    : [];

                setKontekSasaran(sasaranFiltered);
                setKontekProbis(probisFiltered);
            } catch (error) {
                console.error('Gagal filter sasaran dan probis:', error);
                setKontekSasaran([]);
                setKontekProbis([]);
            }
        };

        filterKonteks();
    }, [selectedJenisKonteksSasaran, idInstansi, strukturOrganisasi]);

    useEffect(() => {
        const fetchIndikator = async () => {
            if (!selectedKontekSasaran) return;
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(API_ENDPOINTS.getIndikatorAll(selectedKontekSasaran.value, idInstansi), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setIndikator(response.data);
            } catch (error) {
                console.error('Error fetching indikator:', error);
                setErrorMessage('Gagal mengambil data indikator.');
            }
        };
        setSelectedIndikator(null);
        fetchIndikator();
    }, [idInstansi, selectedKontekSasaran]);

    const handleSelectChange = (name, option) => {
        const value = option?.value || '';
        let updatedFields = { [name]: value };

        switch (name) {
            case 'id_jenis_konteks_sasaran':
                setSelectedJenisKonteksSasaran(option);
                break;
            case 'id_konteks_sasaran':
                setSelectedKontekSasaran(option);
                break;
            case 'id_konteks_probis':
                setSelectedKontekProbis(option);
                break;
            case 'id_indikator':
                setSelectedIndikator(option);
                break;
            case 'id_kamus': {
                setSelectedKamus(option);
                const kategori = kamus.find(k => k.id === option?.value);
                if (kategori) {
                    setSelectedKategoriRisiko({ label: kategori.nama_kategori, value: kategori.id_kategori_risiko });
                    updatedFields.id_kategori_risiko = kategori.id_kategori_risiko;
                    updatedFields.pernyataan_risiko = option?.label || '';
                }
                break;
            }
            default:
                break;
        }

        setFormData(prev => ({
            ...prev,
            ...updatedFields
        }));
    };

    const handleInputText = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateStatements = async (count = 5) => {
        setLoadingGenerate(true);
        try {
            const token = localStorage.getItem('access_token');
            
            // Validasi instansi dan induk unit kerja sebelum generate statements
            const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
            if (!validationResult.valid) {
                showToast("error", validationResult.message);
                setLoadingGenerate(false);
                return;
            }
            
            const response = await axios.post(API_ENDPOINTS.postIdentifikasiRisikoGenerate, {
                id_konteks_sasaran: selectedKontekSasaran?.value,
                id_indikator: selectedIndikator?.value,
                id_konteks_probis: selectedKontekProbis?.value,
                count: count
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const generationId = response.data.generation_id;
            
            // Count fraud and normal statements
            let fraudCount = 0;
            let normalCount = 0;
            
            response.data.statements.forEach(statement => {
                if (statement.tag === 'FRAUD') {
                    fraudCount++;
                } else {
                    normalCount++;
                }
            });

            const statements = response.data.statements.map(statement => ({
                id: statement.id,
                pernyataan_risiko: statement.pernyataan_risiko || "",
                deskripsi: statement.deskripsi || "",
                generation_id: generationId,
                tag: statement.tag || "NORMAL"
            }));

            setGeneratedStatements(statements);
        } catch (error) {
            console.error('Error generating statements:', error);
        } finally {
            setLoadingGenerate(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            
            // Validasi instansi dan induk unit kerja sebelum submit
            const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
            if (!validationResult.valid) {
                showToast("error", validationResult.message);
                setLoading(false);
                return;
            }
            
            const headers = { Authorization: `Bearer ${token}` };

            let payload;

            if (isByAI && selectedStatementAI) {
                const generationId = selectedStatementAI.generation_id;
                const statementId = selectedStatementAI.id;
                if (!generationId || !statementId) {
                    showToast("error", "Data AI tidak lengkap: generation_id atau statement_id kosong.");
                    return;
                }
                payload = {
                    ...formData,
                    tahun: formData.tahun || activeYear,
                    pernyataan_risiko: selectedStatementAI.pernyataan_risiko,
                    deskripsi: selectedStatementAI.deskripsi,
                    generation_id: selectedStatementAI.generation_id,
                    statement_id: selectedStatementAI.id,
                };
            } else {
                payload = {
                    ...formData,
                    tahun: formData.tahun || activeYear,
                    generation_id: '',
                    statement_id: '',
                };
            }

            const res = await axios.post(API_ENDPOINTS.postIdentifikasiRisiko, payload, { headers });
            const identifikasiId = res.data.id;

            const analisisPayload = {
                tahun: tahunId,
                identifikasi_risiko_id: identifikasiId,
                kemungkinan_id_inherit: '',
                dampak_id_inherit: '',
                kemungkinan_id_residual: '',
                dampak_id_residual: '',
                skor_kemungkinan_inherit: 0,
                skor_dampak_inherit: 0,
                skor_kemungkinan_residual: 0,
                skor_dampak_residual: 0,
                use_risk: 'I',
                level_risiko_inherit: 0,
                level_risiko_residual: 0,
                is_akhir_tahun: false,
                kemungkinan_id_treated: '',
                "dampak_id_treated": '',
                skor_kemungkinan_treated: 0,
                skor_dampak_treated: 0,
                level_risiko_treated: 0,
                kemungkinan_id_actual: '',
                dampak_id_actual: '',
                skor_kemungkinan_actual: 0,
                skor_dampak_actual: 0,
                level_risiko_actual: 0,
                id_instansi: idInstansi,
                id_induk_unit_kerja: idIndukUnitKerja
            };

            await axios.post(API_ENDPOINTS.postAnalisisRisiko, analisisPayload, { headers });

            showToast('success', 'Identifikasi dan Analisis Risiko Berhasil Ditambahkan!');
            resetKey(prev => prev + 1);
        } catch (error) {
            const msg = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan.';
            showToast('error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAIStatement = (statement) => {
        console.log('AI Selected:', statement);
        setIsByAI(true);
        setSelectedStatementAI(statement);
        setFormData(prev => ({
            ...prev,
            pernyataan_risiko: statement.pernyataan_risiko,
            deskripsi: statement.deskripsi,
            generation_id: statement.generation_id,
            statement_id: statement.id,
            tag: statement.tag || 'NORMAL'
        }));
    };

    const selectedValues = {
        jenisKonteksSasaran: selectedJenisKonteksSasaran,
        konteksSasaran: selectedKontekSasaran,
        konteksProbis: selectedKontekProbis,
        indikator: selectedIndikator,
        kamus: selectedKamus,
        kategoriRisiko: selectedKategoriRisiko,
    };

    const openModal = () => {
        setShowModal(true);
    };

    if (isRemoved) return null;

    return (
        <div className="card stretch stretch-full">
            <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
            <div className="card-body">
                <ContentLoaderWrapper loading={loading} error={errorMessage}>
                    <form onSubmit={handleSubmit}>
                        <FormIdentifikasiRisiko
                            jenisKonteksSasaran={jenisKonteksSasaran}
                            kontekSasaran={kontekSasaran}
                            kontekProbis={kontekProbis}
                            indikator={indikator}
                            kamus={kamus}
                            kategoriRisiko={kategoriRisiko}
                            selectedValues={selectedValues}
                            handleSelectChange={handleSelectChange}
                            formData={formData}
                            handleInputText={handleInputText}
                            handleGenerateStatements={handleGenerateStatements}
                            isByAI={isByAI}
                            setIsByAI={setIsByAI}
                            openModal={openModal}
                        />
                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <button type="button" className="btn bg-soft-danger text-danger" onClick={() => navigate('/pengelolaan-risiko/identifikasi-risiko')}>
                                <FiArrowLeft size={16} className="me-2" /> Kembali
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <FiSave size={16} className="me-2" /> Simpan Identifikasi Risiko
                            </button>
                        </div>
                    </form>
                </ContentLoaderWrapper>
            </div>
            <PernyataanRisikoModal
                show={showModal}
                onClose={() => setShowModal(false)}
                generatedStatements={generatedStatements}
                loadingGenerate={loadingGenerate}
                onSelectAI={handleSelectAIStatement}
                selectedStatementId={selectedStatementAI?.id}
                onGenerate={handleGenerateStatements}
            />
        </div>
    );
};

IdentifikasiRisikoTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};

export default IdentifikasiRisikoTambahContent;
