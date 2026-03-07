import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import PropTypes from 'prop-types';
import axios from 'axios';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import { showToast } from '@/utils/toast';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import FormIdentifikasiRisiko from './FormIdentifikasiRisiko';
import PernyataanRisikoModal from './PernyataanRisikoModal';
import { validateIds } from '@/utils/validateIds';

const IdentifikasiRisikoEditContent = ({ title = 'Edit Identifikasi Risiko' }) => {
    const { identifikasiId } = useParams();
    const navigate = useNavigate();
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { setGeneratedStatements, setLoadingGenerate, generatedStatements, loadingGenerate } = useOutletContext();

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
    const [selectedStatementAI, setSelectedStatementAI] = useState(null);
    const [isByAI, setIsByAI] = useState(false);

    const [formData, setFormData] = useState({
        tahun: new Date().getFullYear(),
        id_jenis_konteks_sasaran: '',
        id_konteks_sasaran: '',
        id_konteks_probis: '',
        id_indikator: '',
        id_kategori_risiko: '',
        pernyataan_risiko: '',
        uraian_dampak: '',
        deskripsi: '',
        id_bagan_risiko: '',
        id_metode_spip: '',
        disabled: false,
        disabled_reason: '',
        id_instansi: idInstansi,
        id_induk_unit_kerja: idIndukUnitKerja,
        generation_id: '',
        statement_id: '',
    });

    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchInitialData = useCallback(async () => {
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

            const [strukturRes, kamusRes, kategoriRes, identifikasiRes] = await Promise.all([
                axios.get(API_ENDPOINTS.getStrukturOrganisasi(idInstansi, idIndukUnitKerja), { headers }),
                axios.get(API_ENDPOINTS.getKamusRisikoAll(idInstansi), { headers }),
                axios.get(API_ENDPOINTS.getKategoriRisikoAll(idInstansi), { headers }),
                axios.get(API_ENDPOINTS.getIdentifikasiRisikoById(identifikasiId), { headers }),
            ]);

            const struktur = strukturRes.data;
            const data = identifikasiRes.data;

            const filteredJenis = struktur.flatMap(item => item.jenis_konteks.filter(k => k.jenis === 'SASARAN'));

            setJenisKonteksSasaran(filteredJenis);
            setKamus(kamusRes.data);
            setKategoriRisiko(kategoriRes.data);
            setFormData(prev => ({ ...prev, ...data }));

            setSelectedJenisKonteksSasaran({
                label: filteredJenis.find(j => j.id === data.id_jenis_konteks_sasaran)?.nama,
                value: data.id_jenis_konteks_sasaran,
            });

            const konteksSasaran = await axios.get(API_ENDPOINTS.getKonteksSasaranAll(idInstansi), { headers });
            const konteksProbis = await axios.get(API_ENDPOINTS.getKonteksProbisAll(idInstansi), { headers });
            const indikatorData = await axios.get(API_ENDPOINTS.getIndikatorAll(data.id_konteks_sasaran, idInstansi), { headers });

            setKontekSasaran(konteksSasaran.data);
            setKontekProbis(konteksProbis.data);
            setIndikator(indikatorData.data);

            setSelectedKontekSasaran({
                label: konteksSasaran.data.find(i => i.id === data.id_konteks_sasaran)?.nama,
                value: data.id_konteks_sasaran,
            });
            setSelectedKontekProbis({
                label: konteksProbis.data.find(i => i.id === data.id_konteks_probis)?.nama,
                value: data.id_konteks_probis,
            });
            setSelectedIndikator({
                label: indikatorData.data.find(i => i.id === data.id_indikator)?.nama,
                value: data.id_indikator,
            });
            setSelectedKategoriRisiko({
                label: kategoriRes.data.find(i => i.id === data.id_kategori_risiko)?.nama,
                value: data.id_kategori_risiko,
            });

            if (data.deskripsi) {
                setIsByAI(true);
            } else {
                const kamusSelected = kamusRes.data.find(k => k.nama === data.pernyataan_risiko);
                if (kamusSelected) {
                    setSelectedKamus({ label: kamusSelected.nama, value: kamusSelected.id });
                }
                setIsByAI(false);
            }

        } catch (error) {
            console.error(error);
            setErrorMessage('Gagal mengambil data identifikasi risiko');
            showToast('error', 'Gagal mengambil data identifikasi risiko');
        } finally {
            setLoading(false);
        }
    }, [idIndukUnitKerja, idInstansi, identifikasiId]);


    // === Fetch initial data ===
    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleSelectChange = (name, option) => {
        const value = option?.value || '';
        let updated = { [name]: value };

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
                const selected = kamus.find(k => k.id === option?.value);
                if (selected) {
                    setSelectedKategoriRisiko({ label: selected.nama_kategori, value: selected.id_kategori_risiko });
                    updated.id_kategori_risiko = selected.id_kategori_risiko;
                    updated.pernyataan_risiko = selected.nama;
                }
                break;
            }
            default:
                break;
        }

        setFormData(prev => ({ ...prev, ...updated }));
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
                    pernyataan_risiko: selectedStatementAI.pernyataan_risiko,
                    deskripsi: selectedStatementAI.deskripsi,
                    generation_id: generationId,
                    statement_id: statementId,
                };
            } else {
                payload = {
                    ...formData,
                    generation_id: '',
                    statement_id: '',
                    deskripsi: ''
                };
            }

            await axios.put(API_ENDPOINTS.updateIdentifikasiRisiko(identifikasiId), payload, { headers });

            showToast('success', 'Identifikasi dan Analisis Risiko Berhasil Diubah!');
            fetchInitialData();
        } catch (error) {
            const msg = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan perubahan.';
            showToast('error', msg);
        } finally {
            setLoading(false);
        }
    };


    const handleSelectAIStatement = (statement) => {
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

    // Ubah fungsi openModal agar tidak langsung memanggil handleGenerateStatements
    const openModal = () => {
        setShowModal(true);
    };

    if (isRemoved) return null;

    return (
        <div className="card stretch stretch-full">
            <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
            <div className="card-body">
                <ContentLoaderWrapper loading={loading}>
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
                            <button type="button" className="btn bg-soft-danger text-danger" onClick={() => navigate(`/pengelolaan-risiko/identifikasi-risiko/edit/${identifikasiId}`)}>
                                <FiArrowLeft size={16} className="me-2" /> Kembali
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <FiSave size={16} className="me-2" /> Simpan Perubahan
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

IdentifikasiRisikoEditContent.propTypes = {
    title: PropTypes.string,
};

export default IdentifikasiRisikoEditContent;
