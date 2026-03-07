import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import axios from 'axios';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import FormPengguna from './FormPengguna';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateInstansiId } from '@/utils/validateIds';
import { useInstansi } from '../../context/InstansiContext';

const StrukturOrganisasiPenggunaTambahContent = ({ title = "Tambah Pengguna Struktur Organisasi", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { strukturOrganisasiId } = useParams();
    const [selectedPengguna, setSelectedPengguna] = useState(null);
    const [dataPengguna, setDataPengguna] = useState([]);
    const [formData, setFormData] = useState({
        user_ids: []
    });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchExistingUsers = async () => {
            setLoading(true);
            setErrorMessage("");
            try {
                const token = localStorage.getItem('access_token');

                // Validate instansi ID before proceeding
                const instansiValidation = await validateInstansiId(idInstansi, token);
                if (!instansiValidation.valid) {
                    setErrorMessage(instansiValidation.message);
                    setLoading(false);
                    return;
                }

                const response = await axios.get(API_ENDPOINTS.getStrukturOrganisasiAssignUsers(strukturOrganisasiId), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setFormData(prevState => ({
                    ...prevState,
                    user_ids: response.data.map(user => user.id)
                }));

                // Fetch all users after successful validation
                const usersResponse = await axios.get(API_ENDPOINTS.getAllUsers, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { instansi_id: idInstansi }
                });
                setDataPengguna(usersResponse.data);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                setErrorMessage(errorResponse);
            } finally {
                setLoading(false);
            }
        };

        fetchExistingUsers();
    }, [strukturOrganisasiId, idInstansi]);

    const handleSelectPengguna = (selectedOption) => {
        if (formData.user_ids.includes(selectedOption.value)) {
            showToast("error", "Pengguna ini sudah ada di struktur organisasi.");
        } else {
            setSelectedPengguna(selectedOption);
            setFormData(prevState => ({
                ...prevState,
                user_ids: [
                    ...prevState.user_ids,
                    selectedOption.value
                ]
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");

        try {
            const token = localStorage.getItem("access_token");

            // Validate instansi ID before submitting
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                setErrorMessage(instansiValidation.message);
                setLoading(false);
                return;
            }

            const uniqueUserIds = [...new Set(formData.user_ids)];
            const submissionData = {
                ...formData,
                user_ids: uniqueUserIds
            };

            await axios.post(API_ENDPOINTS.postStrukturOrganisasiAssignUsers(strukturOrganisasiId), submissionData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Pengguna Struktur Organisasi Berhasil Ditambahkan!");
            resetKey((prevKey) => prevKey + 1);
            navigate(`/parameters/struktur-organisasi/users/${strukturOrganisasiId}`);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            showToast("error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate(`/parameters/struktur-organisasi/users/${strukturOrganisasiId}`);
    };

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
                        <FormPengguna
                            formData={formData}
                            setFormData={setFormData}
                            dataPengguna={dataPengguna}
                            selectedPengguna={selectedPengguna}
                            setSelectedPengguna={handleSelectPengguna}
                        />
                    </div>
                    <div className="card-footer border-top d-flex justify-content-end p-3">
                        <button className="btn btn-light-secondary me-2" type="button" onClick={handleBack}>
                            <FiArrowLeft size={20} className="me-1" /> Kembali
                        </button>
                        <button className="btn btn-primary" type="submit">
                            <FiSave size={20} className="me-1" /> Simpan
                        </button>
                    </div>
                </form>
            </ContentLoaderWrapper>
        </div>
    );
};

StrukturOrganisasiPenggunaTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};

export default StrukturOrganisasiPenggunaTambahContent;
