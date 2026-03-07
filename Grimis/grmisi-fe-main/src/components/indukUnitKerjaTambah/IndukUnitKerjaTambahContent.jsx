import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import SelectDropdown from '@/components/shared/SelectDropdown';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateInstansiId } from '@/utils/validateIds';

const IndukUnitKerjaTambahContent = ({ title = "Tambah Induk Unit Kerja", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const [dataIndukUnitKerja, setDataIndukUnitKerja] = useState([]);
    const [selectedIndukUnitKerja, setSelectedIndukUnitKerja] = useState(null);
    const [formData, setFormData] = useState({
        nama_induk_unit: '',
        kode_induk: '',
        parent_kode_induk: '',
        id_instansi: idInstansi,
        name: '',
        parent_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');

                // Validate instansi ID before using it
                const instansiValidation = await validateInstansiId(idInstansi, token);
                if (!instansiValidation.valid) {
                    setErrorMessage(instansiValidation.message);
                    setLoading(false);
                    return;
                }

                const response = await axios.get(API_ENDPOINTS.getIndukUnitKerjaByInstansiId(idInstansi), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setDataIndukUnitKerja(response.data);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                setErrorMessage(errorResponse);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [idInstansi]);

    // Update formData when idInstansi changes
    useEffect(() => {
        setFormData(prevState => ({
            ...prevState,
            id_instansi: idInstansi
        }));
    }, [idInstansi]);

    const handleInputChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value
        }));
    };

    const handleSelectChange = (selectedOption) => {
        setSelectedIndukUnitKerja(selectedOption);
        setFormData((prevState) => ({
            ...prevState,
            parent_kode_induk: selectedOption ? selectedOption.parent_kode_induk : null,
            parent_id: selectedOption ? selectedOption.value : null,
            name: selectedOption && selectedOption.label !== 'Tidak ada induk unit kerja' ? selectedOption.label : '-'
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");

        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };

            // Validate instansi ID before submitting
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                setErrorMessage(instansiValidation.message);
                setLoading(false);
                return;
            }

            // Step 1: Create the induk unit kerja
            console.log("Creating induk unit kerja...");
            const res = await axios.post(API_ENDPOINTS.postIndukUnitKerja, formData, { headers });
            const indukUnitKerjaId = res.data?.id;

            if (indukUnitKerjaId) {
                try {
                    // Step 2: Create template based on current year, instansi, and the new unit kerja
                    const currentYear = new Date().getFullYear();
                    console.log("Creating template for year:", currentYear);
                    const templateResponse = await axios.post(
                        API_ENDPOINTS.postPetaTemplate(currentYear, idInstansi, indukUnitKerjaId),
                        {},
                        { headers }
                    );

                    const templateId = templateResponse.data?.id;

                    if (templateId) {
                        console.log("Template created with ID:", templateId);

                        // Step 3: Setup the matrix with default 5x5
                        // console.log("Setting up matrix...");
                        // await axios.post(
                        //     `${API_ENDPOINTS.getPetaTemplateById(templateId)}/setup-matrix?tahun=${currentYear}&id_instansi=${idInstansi}&id_induk_unit_kerja=${indukUnitKerjaId}&dampak=5&frekuensi=5`,
                        //     {},
                        //     { headers }
                        // );

                        // Step 4: Sync criteria with template - This creates kriteria based on the template's classifications
                        console.log("Syncing criteria with template...");
                        await axios.post(
                            API_ENDPOINTS.syncKriteriaRisikoFromTemplate(idInstansi, indukUnitKerjaId, templateId),
                            {},
                            { headers }
                        );

                        // Step 5: Update kategori frekuensi dengan nama yang benar
                        try {
                            console.log("Fetching frekuensi categories...");
                            const kategoriResponse = await axios.get(
                                API_ENDPOINTS.getPetaKategoriFrekuensi(templateId),
                                { headers }
                            );

                            const kategoriList = kategoriResponse.data;

                            const labelList = ['Sangat Kecil', 'Kecil', 'Sedang', 'Besar', 'Sangat Besar'];

                            if (Array.isArray(kategoriList) && kategoriList.length === 5) {
                                const updateKategoriPromises = kategoriList.map((kategori, index) => {
                                    const payload = { ...kategori, value: labelList[index] };
                                    return axios.put(
                                        API_ENDPOINTS.putPetaKategori(kategori.id),
                                        payload,
                                        { headers }
                                    );
                                });

                                await Promise.all(updateKategoriPromises);
                                console.log("Kategori frekuensi berhasil diperbarui!");
                            } else {
                                console.warn("Jumlah kategori frekuensi tidak sesuai. Ditemukan:", kategoriList.length);
                            }
                        } catch (kategoriError) {
                            console.error("Gagal memperbarui kategori frekuensi:", kategoriError);
                        }

                        // Step 6: Update kategori dampak dengan nilai yang sesuai
                        try {
                            console.log("Fetching dampak categories...");
                            const kategoriDampakResponse = await axios.get(
                                API_ENDPOINTS.getPetaKategoriDampak(templateId),
                                { headers }
                            );

                            const kategoriDampakList = kategoriDampakResponse.data;

                            const dampakLabelList = [
                                'TIDAK SIGNIFIKAN',
                                'MINOR',
                                'MEDIUM',
                                'SIGNIFIKAN',
                                'SANGAT SIGNIFIKAN'
                            ];

                            if (Array.isArray(kategoriDampakList) && kategoriDampakList.length === 5) {
                                const updateDampakPromises = kategoriDampakList.map((kategori, index) => {
                                    const payload = { ...kategori, value: dampakLabelList[index] };
                                    return axios.put(
                                        API_ENDPOINTS.putPetaKategori(kategori.id),
                                        payload,
                                        { headers }
                                    );
                                });

                                await Promise.all(updateDampakPromises);
                                console.log("Kategori dampak berhasil diperbarui!");
                            } else {
                                console.warn("Jumlah kategori dampak tidak sesuai. Ditemukan:", kategoriDampakList.length);
                            }
                        } catch (kategoriDampakError) {
                            console.error("Gagal memperbarui kategori dampak:", kategoriDampakError);
                        }


                        console.log("Template and criteria setup complete!");
                    } else {
                        console.error("Template creation failed - no template ID returned");
                    }
                } catch (templateError) {
                    console.error("Error in template creation process:", templateError);
                }
            } else {
                console.error("Failed to get induk unit kerja ID from response");
            }

            showToast("success", "Induk Unit Kerja Berhasil Ditambahkan!")
            setTimeout(() => {
                navigate('/organisasi/induk-unit-kerja');
                window.location.reload();
            }, 1000);
            resetKey((prevKey) => prevKey + 1);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            showToast("error", errorResponse);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/organisasi/induk-unit-kerja');
    };

    if (isRemoved) return null;
    if (loading) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <div className="card shadow-sm border-0 mb-3">
            <CardHeader
                title={title}
                isRemoved={isRemoved}
                onRefresh={handleRefresh}
                onExpand={handleExpand}
                onRemove={handleDelete}
            />
            <ContentLoaderWrapper loading={loading} error={errorMessage}>
                <form onSubmit={handleSubmit}>
                    <div className="card-body">
                        <div className="row">
                            <div className="col-md-6 mb-4">
                                <label className="form-label">Nama Induk Unit <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-4"
                                    name="nama_induk_unit"
                                    placeholder="Nama Induk Unit"
                                    value={formData.nama_induk_unit}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4">
                                <label className="form-label">Kode Induk <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-4"
                                    name="kode_induk"
                                    placeholder="Kode Induk"
                                    value={formData.kode_induk}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4">
                                <label className="form-label">Parent Induk Unit <span className="text-danger">*</span></label>
                                <SelectDropdown
                                    options={[
                                        { label: 'Tidak ada induk unit kerja', value: null },
                                        ...dataIndukUnitKerja.map(item => ({
                                            label: item.nama_induk_unit,
                                            value: item.id,
                                            parent_kode_induk: item.kode_induk
                                        }))
                                    ]}
                                    selectedOption={selectedIndukUnitKerja}
                                    onSelectOption={handleSelectChange}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="card-footer border-top d-flex justify-content-end gap-2 p-3">
                        <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}>
                            <FiArrowLeft size={16} className="me-2" />Kembali
                        </button>
                        <button className="btn btn-primary" type="submit">
                            <FiSave size={16} className="me-2" /> Simpan
                        </button>
                    </div>
                </form>
            </ContentLoaderWrapper>
        </div>
    );
};

IndukUnitKerjaTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired
};

export default IndukUnitKerjaTambahContent;
