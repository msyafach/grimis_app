import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import SelectDropdown from '@/components/shared/SelectDropdown';
import { useInstansi } from '../../context/InstansiContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';

const IndukUnitKerjaEditContent = ({ title = "Edit Induk Unit Kerja" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { indukUnitKerjaId } = useParams();
    const [dataIndukUnitKerja, setDataIndukUnitKerja] = useState([]);
    const [formData, setFormData] = useState({
        nama_induk_unit: '',
        kode_induk: '',
        parent_kode_induk: '',
        id_instansi: idInstansi,
        name: '',
        parent_id: ''
    });
    const [selectedIndukUnitKerja, setSelectedIndukUnitKerja] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchInstansiData = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');

            // Validate instansi ID before using it
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                setErrorMessage(instansiValidation.message);
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
    }, [idInstansi]);

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');

            // Validate indukUnitKerjaId before using it
            const indukUnitValidation = await validateIndukUnitKerjaId(indukUnitKerjaId, token);
            if (!indukUnitValidation.valid) {
                setErrorMessage(indukUnitValidation.message);
                return;
            }

            const response = await axios.get(API_ENDPOINTS.getIndukUnitKerjaById(indukUnitKerjaId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            setFormData({
                nama_induk_unit: response.data.nama_induk_unit,
                kode_induk: response.data.kode_induk,
                parent_kode_induk: response.data.parent_kode_induk,
                id_instansi: response.data.id_instansi,
                name: response.data.name,
                parent_id: response.data.parent_id,
            });

            const selectedOption = dataIndukUnitKerja.find(item => item.kode_induk === response.data.parent_kode_induk);
            if (selectedOption) {
                setSelectedIndukUnitKerja({
                    label: selectedOption.nama_induk_unit,
                    value: selectedOption.id,
                    parent_kode_induk: selectedOption.kode_induk,
                    parent_id: selectedOption.id
                });
            } else {
                setSelectedIndukUnitKerja({ label: 'Tidak ada induk unit kerja' });
            }
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            setErrorMessage(errorResponse);
        }
    }, [indukUnitKerjaId, dataIndukUnitKerja]);

    useEffect(() => {
        fetchInstansiData();
    }, [fetchInstansiData]);

    useEffect(() => {
        if (dataIndukUnitKerja.length > 0) {
            fetchData();
        }
    }, [fetchData, dataIndukUnitKerja]);

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

            // Validate both IDs before submitting
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                setErrorMessage(instansiValidation.message);
                setLoading(false);
                return;
            }

            const indukUnitValidation = await validateIndukUnitKerjaId(indukUnitKerjaId, token);
            if (!indukUnitValidation.valid) {
                setErrorMessage(indukUnitValidation.message);
                setLoading(false);
                return;
            }

            await axios.put(API_ENDPOINTS.updateIndukUnitKerja(indukUnitKerjaId), formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showToast("success", "Induk Unit Kerja berhasil diperbarui!");
            navigate('/organisasi/induk-unit-kerja');
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

IndukUnitKerjaEditContent.propTypes = {
    title: PropTypes.string
};

export default IndukUnitKerjaEditContent;
