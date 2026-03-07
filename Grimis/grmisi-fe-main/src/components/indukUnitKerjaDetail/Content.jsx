import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import { FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import API_ENDPOINTS from '../../config/apiConfig';

const IndukUnitKerjaDetailContent = ({ title = "Detail Induk Unit Kerja" }) => {
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
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');

            // Fetch induk unit kerja list
            const [listResponse, detailResponse] = await Promise.all([
                axios.get(API_ENDPOINTS.getIndukUnitKerjaByInstansiId(idInstansi), {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(API_ENDPOINTS.getIndukUnitKerjaById(indukUnitKerjaId), {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            setDataIndukUnitKerja(listResponse.data);

            const data = detailResponse.data;
            setFormData({
                nama_induk_unit: data.nama_induk_unit,
                kode_induk: data.kode_induk,
                parent_kode_induk: data.parent_kode_induk,
                id_instansi: data.id_instansi,
                name: data.name,
                parent_id: data.parent_id,
            });

        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            setErrorMessage(errorResponse);
        } finally {
            setLoading(false);
        }
    }, [idInstansi, indukUnitKerjaId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const parentLabel = useMemo(() => {
        if (!formData.parent_kode_induk) return 'Tidak ada induk unit kerja';
        return dataIndukUnitKerja.find(item => item.kode_induk === formData.parent_kode_induk)?.nama_induk_unit || 'Tidak ditemukan';
    }, [formData.parent_kode_induk, dataIndukUnitKerja]);

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
        <>
            <div className="card stretch stretch-full">
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body">
                    <form>
                        <div className="mb-4">
                            <label className="form-label">Nama Induk Unit Kerja <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3 bg-light"
                                name="nama_induk_unit"
                                placeholder="Nama Induk Unit Kerja"
                                value={formData.nama_induk_unit}
                                disabled
                            />
                        </div>
                        <div className="mb-4">
                            <label className="form-label">Kode Induk Unit Kerja <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3 bg-light"
                                name="kode_induk"
                                placeholder="Kode Induk Unit Kerja"
                                value={formData.kode_induk}
                                disabled
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label">Induk Unit Kerja <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3 bg-light"
                                name="parent_kode_induk"
                                placeholder="Kode Induk Unit Kerja"
                                value={parentLabel}
                                disabled
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label">Nama<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3 bg-light"
                                name="name"
                                placeholder="Nama"
                                value={formData.name}
                                disabled
                            />
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                            <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}>
                                <FiArrowLeft size={16} className="me-2" />Kembali
                            </button>
                        </div>
                    </form>
                </div>
            </div>

        </>
    );
};

IndukUnitKerjaDetailContent.propTypes = {
    title: PropTypes.string
};

export default IndukUnitKerjaDetailContent;
