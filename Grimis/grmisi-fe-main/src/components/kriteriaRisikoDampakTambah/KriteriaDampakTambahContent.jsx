import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import Form from './Form';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import SelectDropdown from '../shared/SelectDropdown';

setLanguage('id');

const KriteriaDampakTambahContent = ({ title = "Tambah Kriteria Risiko Dampak", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [formData, setFormData] = useState({
        "kode": "",
        "nama": "",
        "nilai": 0,
        "deskripsi": "",
        "id_instansi": idInstansi,
        "id_induk_unit_kerja": idIndukUnitKerja,
    });
    
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateData, setTemplateData] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Fetch templates on component mount
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(
                    API_ENDPOINTS.getPetaTemplate(new Date().getFullYear()), 
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                
                if (response.data) {
                    setTemplates(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch templates:", error);
            }
        };
        
        fetchTemplates();
    }, []);
    
    if (isRemoved) return null;

    const handleInput = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
            id_instansi: idInstansi,
            id_induk_unit_kerja: idIndukUnitKerja,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("access_token");
            await axios.post(API_ENDPOINTS.postKriteriaRisikoDampak, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Kriteria Risiko Dampak Berhasil Ditambahkan!");
            resetKey((prevKey) => prevKey + 1);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorMessage);
            showToast("error", translatedError);
        }
    };
    
    const handleTemplateChange = async (selected) => {
        setSelectedTemplate(selected);
        if (!selected) {
            setTemplateData([]);
            return;
        }
        
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(
                API_ENDPOINTS.getPetaKlasifikasiDampak(selected.value),
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            
            if (response.data && response.data.length > 0) {
                setTemplateData(response.data);
            } else {
                showToast('warning', 'Template tidak memiliki data klasifikasi dampak');
                setTemplateData([]);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.detail || 'Gagal memuat data klasifikasi dampak';
            showToast('error', errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    const applyTemplateData = (item) => {
        setFormData({
            kode: String(item.key),
            nama: item.value,
            nilai: item.key,
            deskripsi: item.value,
            id_instansi: idInstansi,
            id_induk_unit_kerja: idIndukUnitKerja,
        });
    };

    const handleBack = () => {
        navigate('/kriteria-risiko/dampak');
    };

    return (
        <>
            <div className="card shadow-sm border-0 mb-3">
                <CardHeader
                    title={title}
                    isRemoved={isRemoved}
                    onRefresh={handleRefresh}
                    onExpand={handleExpand}
                    onRemove={handleDelete}
                />
                <div className="card-body">
                    <div className="row mb-4">
                        <div className="col-md-6">
                            <label className="form-label">Pilih Template</label>
                            <SelectDropdown
                                options={templates.map(template => ({
                                    label: `${template.nama} (${template.tahun})`,
                                    value: template.id,
                                }))}
                                selectedOption={selectedTemplate}
                                onSelectOption={handleTemplateChange}
                                placeholder="Pilih template peta risiko..."
                            />
                        </div>
                    </div>
                    
                    {templateData.length > 0 && (
                        <div className="mb-4">
                            <label className="form-label">Klasifikasi Dampak dari Template</label>
                            <div className="row">
                                {templateData.map((item, index) => (
                                    <div key={index} className="col-md-4 mb-2">
                                        <div className="card">
                                            <div className="card-body">
                                                <h6>Nilai {item.key}: {item.value}</h6>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-sm btn-outline-primary" 
                                                    onClick={() => applyTemplateData(item)}
                                                >
                                                    <FiRefreshCw size={14} className="me-1" /> Gunakan
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="d-flex justify-content-center align-items-center">
                        <div className="col-12">
                            <form onSubmit={handleSubmit}>
                                <Form
                                    formData={formData}
                                    setFormData={setFormData}
                                    handleInput={handleInput}
                                />
                                <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                    <button className="btn btn-light-secondary" type="button" onClick={handleBack}>
                                        <FiArrowLeft size={16} className="me-2" />Kembali
                                    </button>
                                    <button className="btn btn-primary" type="submit">
                                        <FiSave size={16} className="me-2" />Simpan
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

KriteriaDampakTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};

export default KriteriaDampakTambahContent;
