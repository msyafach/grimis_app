import { useEffect, useState } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import axios from 'axios';
import { FiEdit3, FiMessageSquare, FiSend, FiTrash2, FiLock, FiUnlock } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import API_ENDPOINTS from '../../config/apiConfig';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import { validateIds } from '@/utils/validateIds';
import { showToast } from '@/utils/toast';
import { useAuth } from '../../context/AuthContext';

const getBadgeClass = (num) => {
    if (num >= 1 && num <= 15) return 'bg-light-success text-success';
    if (num >= 16 && num <= 20) return 'bg-light-warning text-warning';
    if (num >= 21 && num <= 25) return 'bg-light-danger text-danger';
    return 'bg-light text-secondary';
};

const IdentifikasiRisikoEditContent = ({ title = "Edit Pernyataan Risiko" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { identifikasiId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { user } = useAuth();
    const [identifikasiRisiko, setIdentifikasiRisiko] = useState({});
    const [analisisRisiko, setAnalisisRisiko] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // Comment state
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [newReply, setNewReply] = useState({});
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentError, setCommentError] = useState('');
    
    // Comment type selection
    const [commentType, setCommentType] = useState('IDENTIFIKASI');
    const [selectedRefId, setSelectedRefId] = useState('');
    const [refOptions, setRefOptions] = useState([]);
    const [loadingRefOptions, setLoadingRefOptions] = useState(false);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');

                // Validasi instansi dan induk unit kerja menggunakan validateIds
                const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
                if (!validationResult.valid) {
                    setError(validationResult.message);
                    setLoading(false);
                    return;
                }

                const headers = { Authorization: `Bearer ${token}` };

                const identifikasiRes = axios.get(API_ENDPOINTS.getIdentifikasiRisikoById(identifikasiId), { headers });
                const analisisRes = axios.get(API_ENDPOINTS.getAnalisisRisikoByIdentifikasiRisikoId(identifikasiId), { headers });
                const [identifikasiResponse, analisisResponse] = await Promise.all([identifikasiRes, analisisRes]);

                const identifikasiData = identifikasiResponse.data;
                const analisisData = analisisResponse.data[0];
                const analisisId = analisisData.id;

                const [indikatorResponse, konteksSasaranResponse, konteksProbisResponse, attachmentResponse, pengendalianResponse] = await Promise.all([
                    axios.get(API_ENDPOINTS.getIndikatorById(identifikasiData.id_indikator), { headers }),
                    axios.get(API_ENDPOINTS.getKonteksSasaranById(identifikasiData.id_konteks_sasaran), { headers }),
                    axios.get(API_ENDPOINTS.getKonteksProbisById(identifikasiData.id_konteks_probis), { headers }),
                    axios.get(API_ENDPOINTS.getAnalisisRisikoAttachment(analisisId), { headers }),
                    axios.get(API_ENDPOINTS.getEvaluasiRisikoByAnalisis(analisisId), { headers }),
                ]);

                setIdentifikasiRisiko({
                    ...identifikasiData,
                    indikator: indikatorResponse.data,
                    konteks_sasaran: konteksSasaranResponse.data,
                    konteks_probis: konteksProbisResponse.data,
                });

                const pengendalianData = pengendalianResponse.data;

                // Calculate total RTP count in the format "realized/total"
                let totalRealized = 0;
                let totalPlanned = 0;

                pengendalianData.forEach(pengendalian => {
                    if (typeof pengendalian.rtp_count === 'string' && pengendalian.rtp_count.includes('/')) {
                        // Parse the "realized/total" format
                        const [realized, total] = pengendalian.rtp_count.split('/').map(Number);
                        totalRealized += realized;
                        totalPlanned += total;
                    } else if (typeof pengendalian.rtp_count === 'number') {
                        // Legacy format - just add to total
                        totalPlanned += pengendalian.rtp_count || 0;
                    }
                });

                const totalRtpCount = `${totalRealized}/${totalPlanned}`;

                setAnalisisRisiko({
                    ...analisisData,
                    attachment: attachmentResponse.data,
                    pengendalian: {
                        ...pengendalianData,
                        totalRtpCount,
                    },
                });

            } catch (error) {
                console.error("Error fetching data:", error);
                setError("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [identifikasiId, idInstansi, idIndukUnitKerja]);

    useEffect(() => {
        const fetchComments = async () => {
            if (!selectedRefId || !commentType) return;
            
            setLoadingComments(true);
            try {
                const token = localStorage.getItem('access_token');
                const headers = { Authorization: `Bearer ${token}` };
                
                // Find the selected option to get the actual refId
                const selectedOption = refOptions.find(option => option.id === selectedRefId);
                if (!selectedOption) return;
                
                // Use the actual refId for the API call
                const actualRefId = selectedOption.refId || selectedRefId;
                
                const response = await axios.get(
                    API_ENDPOINTS.getKomentarByRefId(
                        actualRefId, 
                        commentType,
                        identifikasiRisiko.tahun
                    ), 
                    { headers }
                );
                
                setComments(response.data);
                setCommentError('');
            } catch (error) {
                console.error("Error fetching comments:", error);
                setCommentError("Gagal mengambil komentar.");
            } finally {
                setLoadingComments(false);
            }
        };

        if (identifikasiRisiko.tahun && selectedRefId) {
            fetchComments();
        }
    }, [selectedRefId, commentType, identifikasiRisiko.tahun, refOptions]);

    // Effect to load reference options based on selected comment type
    useEffect(() => {
        const fetchRefOptions = async () => {
            if (!identifikasiId || !commentType) return;
            
            setLoadingRefOptions(true);
            try {
                const token = localStorage.getItem('access_token');
                const headers = { Authorization: `Bearer ${token}` };
                
                let options = [];
                
                switch (commentType) {
                    case 'IDENTIFIKASI':
                        // For identifikasi, we just use the current identifikasiId
                        options = [{
                            id: identifikasiId,
                            name: identifikasiRisiko?.pernyataan_risiko || 'Pernyataan Risiko'
                        }];
                        break;
                        
                    case 'ANALISIS':
                        // Get analisis risiko options
                        const analisisResponse = await axios.get(
                            API_ENDPOINTS.getAnalisisRisikoByIdentifikasiRisikoId(identifikasiId),
                            { headers }
                        );
                        
                        if (analisisResponse.data && analisisResponse.data.length > 0) {
                            const analisis = analisisResponse.data[0]; // Usually there's only one analysis per identification
                            
                            // Create separate options for each risk level type
                            options = [
                                {
                                    id: `${analisis.id}_inherent`,
                                    refId: analisis.id,
                                    name: `Inherent Risk (Level ${analisis.level_risiko_inherit || 'N/A'})`,
                                    analysisType: 'inherent'
                                },
                                {
                                    id: `${analisis.id}_residual`,
                                    refId: analisis.id,
                                    name: `Residual Risk (Level ${analisis.level_risiko_residual || 'N/A'})`,
                                    analysisType: 'residual'
                                },
                                {
                                    id: `${analisis.id}_treated`,
                                    refId: analisis.id,
                                    name: `Treated Risk (Level ${analisis.level_risiko_treated || 'N/A'})`,
                                    analysisType: 'treated'
                                },
                                {
                                    id: `${analisis.id}_actual`,
                                    refId: analisis.id,
                                    name: `Actual Risk (Level ${analisis.level_risiko_actual || 'N/A'})`,
                                    analysisType: 'actual'
                                }
                            ];
                        }
                        break;
                        
                    case 'EVALUASI':
                        // Get evaluasi risiko options
                        const evaluasiResponse = await axios.get(
                            API_ENDPOINTS.getEvaluasiRisikoByIdentifikasi(identifikasiId),
                            { headers }
                        );
                        options = evaluasiResponse.data.map(item => ({
                            id: item.id,
                            refId: item.id,
                            name: item.deskripsi ? 
                                (item.deskripsi.length > 50 ? 
                                    `${item.deskripsi.substring(0, 50)}...` : 
                                    item.deskripsi) : 
                                `Evaluasi: ${item.jenis || ''} ${item.kategori || ''}`
                        }));
                        break;
                        
                    case 'RTP':
                        // Get RTP options
                        const rtpResponse = await axios.get(
                            API_ENDPOINTS.getRtpbyIdentifikasi(identifikasiId),
                            { headers }
                        );
                        options = rtpResponse.data.map(item => ({
                            id: item.id,
                            refId: item.id,
                            name: item.rencana_pengendalian ? 
                                (item.rencana_pengendalian.length > 50 ? 
                                    `${item.rencana_pengendalian.substring(0, 50)}...` : 
                                    item.rencana_pengendalian) : 
                                `RTP: ${item.respon_risiko || ''} - ${item.status || 'N/A'}`
                        }));
                        break;
                }
                
                setRefOptions(options);
                
                // Auto-select the first option if available
                if (options.length > 0) {
                    setSelectedRefId(options[0].id);
                } else {
                    setSelectedRefId('');
                    setComments([]);
                }
                
            } catch (error) {
                console.error(`Error fetching ${commentType} options:`, error);
                setRefOptions([]);
                setSelectedRefId('');
                setComments([]);
            } finally {
                setLoadingRefOptions(false);
            }
        };
        
        if (identifikasiRisiko.id) {
            fetchRefOptions();
        }
    }, [commentType, identifikasiId, identifikasiRisiko.id, identifikasiRisiko?.pernyataan_risiko]);

    const handleNavigateTo = async (subpath) => {
        if (!analisisRisiko?.id) return;

        try {
            const token = localStorage.getItem('access_token');

            // Validasi instansi dan induk unit kerja sebelum navigasi
            const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
            if (!validationResult.valid) {
                showToast("error", validationResult.message);
                return;
            }

            navigate(`/pengelolaan-risiko/identifikasi-risiko/edit/${identifikasiId}/${subpath}`, {
                state: { analisisId: analisisRisiko.id },
            });
        } catch (error) {
            console.error("Error validating IDs:", error);
            showToast("error", "Gagal memvalidasi data.");
        }
    };

    // Comment functions
    const handleSubmitComment = async () => {
        if (!newComment.trim() || !selectedRefId) return;
        
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            
            // Find the selected option to get the actual refId
            const selectedOption = refOptions.find(option => option.id === selectedRefId);
            if (!selectedOption) return;
            
            // Use the refId (actual database ID) for the API call
            const actualRefId = selectedOption.refId || selectedRefId;
            
            const commentData = {
                tipe_komentar: commentType,
                ref_id: actualRefId,
                konten: newComment,
                tahun: identifikasiRisiko.tahun,
                // Add required fields for backend compatibility
                text: newComment,
                type: commentType
            };
            
            // For analysis type, add metadata about which type of analysis
            if (commentType === 'ANALISIS' && selectedOption.analysisType) {
                commentData.metadata = {
                    analysis_type: selectedOption.analysisType
                };
            }
            
            await axios.post(API_ENDPOINTS.postKomentar, commentData, { headers });
            
            // Refresh comments
            const response = await axios.get(
                API_ENDPOINTS.getKomentarByRefId(
                    actualRefId, 
                    commentType,
                    identifikasiRisiko.tahun
                ), 
                { headers }
            );
            
            setComments(response.data);
            setNewComment('');
            showToast("success", "Komentar berhasil ditambahkan");
        } catch (error) {
            console.error("Error adding comment:", error);
            showToast("error", "Gagal menambahkan komentar");
        }
    };

    const handleSubmitReply = async (commentId) => {
        if (!newReply[commentId]?.trim()) return;
        
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const replyData = {
                konten: newReply[commentId],
                parent_id: commentId
            };
            
            await axios.post(API_ENDPOINTS.postKomentarReply, replyData, { headers });
            
            // Find the selected option to get the actual refId
            const selectedOption = refOptions.find(option => option.id === selectedRefId);
            if (!selectedOption) return;
            const actualRefId = selectedOption.refId || selectedRefId;
            
            // Refresh comments
            const response = await axios.get(
                API_ENDPOINTS.getKomentarByRefId(
                    actualRefId, 
                    commentType,
                    identifikasiRisiko.tahun
                ), 
                { headers }
            );
            
            setComments(response.data);
            setNewReply(prev => ({...prev, [commentId]: ''}));
            showToast("success", "Balasan berhasil ditambahkan");
        } catch (error) {
            console.error("Error adding reply:", error);
            showToast("error", "Gagal menambahkan balasan");
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            
            await axios.delete(API_ENDPOINTS.deleteKomentar(commentId), { headers });
            
            // Find the selected option to get the actual refId
            const selectedOption = refOptions.find(option => option.id === selectedRefId);
            if (!selectedOption) return;
            const actualRefId = selectedOption.refId || selectedRefId;
            
            // Refresh comments
            const response = await axios.get(
                API_ENDPOINTS.getKomentarByRefId(
                    actualRefId, 
                    commentType,
                    identifikasiRisiko.tahun
                ), 
                { headers }
            );
            
            setComments(response.data);
            showToast("success", "Komentar berhasil dihapus");
        } catch (error) {
            console.error("Error deleting comment:", error);
            showToast("error", "Gagal menghapus komentar");
        }
    };

    const handleToggleCommentStatus = async (commentId, currentStatus) => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
            
            await axios.put(
                API_ENDPOINTS.updateKomentarStatus(commentId), 
                { status: newStatus }, 
                { headers }
            );
            
            // Find the selected option to get the actual refId
            const selectedOption = refOptions.find(option => option.id === selectedRefId);
            if (!selectedOption) return;
            const actualRefId = selectedOption.refId || selectedRefId;
            
            // Refresh comments
            const response = await axios.get(
                API_ENDPOINTS.getKomentarByRefId(
                    actualRefId, 
                    commentType,
                    identifikasiRisiko.tahun
                ), 
                { headers }
            );
            
            setComments(response.data);
            showToast("success", `Komentar berhasil ${newStatus === 'OPEN' ? 'dibuka' : 'ditutup'}`);
        } catch (error) {
            console.error("Error updating comment status:", error);
            showToast("error", "Gagal mengubah status komentar");
        }
    };
    
    const handleChangeCommentType = (e) => {
        setCommentType(e.target.value);
        setSelectedRefId('');
        setComments([]);
    };
    
    const handleChangeRefId = (e) => {
        setSelectedRefId(e.target.value);
    };

    // Check if user can create comments (PENGAWAS_INTERN, UNIT_MANAJEMEN_RISIKO, SUPER_ADMIN)
    const canCreateComments = user && ['PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO', 'SUPER_ADMIN'].includes(user.role);
    
    // Check if user can reply (all roles except PEGAWAI)
    const canReply = user && user.role !== 'PEGAWAI';
    
    // Check if user can close comments (PENGAWAS_INTERN, UNIT_MANAJEMEN_RISIKO, SUPER_ADMIN)
    const canCloseComments = user && ['PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO', 'SUPER_ADMIN'].includes(user.role);

    if (isRemoved) return null;

    return (
        <div className="card stretch stretch-full">
            <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
            <div className="card-body">
                <ContentLoaderWrapper loading={loading} error={error}>
                    <div className="row">
                        <div className="col-8">
                            <h5 className="fw-bold">Pemilik</h5>
                        </div>
                        <div className="col-4 d-flex justify-content-end">
                            <button className="btn btn-md btn-primary" type="button"
                                onClick={() => navigate(`/pengelolaan-risiko/identifikasi-risiko/edit/${identifikasiId}/edit`)}
                            >
                                <FiEdit3 size={16} className="me-2" /> Ubah
                            </button>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-12 mb-4">
                            <label className="form-label">Pernyataan Risiko</label>
                            <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={identifikasiRisiko?.pernyataan_risiko || ''} disabled />
                        </div>
                        <div className="col-12 mb-4">
                            <label className="form-label">Sasaran</label>
                            <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={identifikasiRisiko?.konteks_sasaran?.nama || ''} disabled />
                        </div>
                        <div className="col-12 mb-4">
                            <label className="form-label">Indikator</label>
                            <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={identifikasiRisiko?.indikator?.nama || ''} disabled />
                        </div>
                        <div className="col-12 mb-4">
                            <label className="form-label">Probis</label>
                            <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={identifikasiRisiko?.konteks_probis?.nama || ''} disabled />
                        </div>
                    </div>
                    <div className="row"><div className="col-12"><h5 className="fw-bold">Level</h5></div></div>
                    <div className="row">
                        {[
                            { label: 'Inherent Risk', key: 'level_risiko_inherit', path: 'inherent' },
                            { label: 'Residual Risk', key: 'level_risiko_residual', path: 'residual' },
                            { label: 'Treated Risk', key: 'level_risiko_treated', path: 'treated' },
                            { label: 'Actual Risk', key: 'level_risiko_actual', path: 'actual' },
                        ].map(({ label, key, path }) => (
                            <div className="col-3" key={key}>
                                <div className="mb-4">
                                    <label className="form-label">{label}</label>
                                    <div className="d-flex align-items-center">
                                        <span className={`badge badge-sm ${getBadgeClass(analisisRisiko?.[key])} rounded-4 p-2 w-100 d-flex justify-content-between align-items-center`}>
                                            <span className="ms-3 fs-5 text-center">{analisisRisiko?.[key] || '0'}</span>
                                            <button className="btn btn-sm btn-primary ms-2" onClick={() => handleNavigateTo(path)}>
                                                <FiEdit3 size={16} />
                                            </button>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="row"><div className="col-12"><h5 className="fw-bold">Pengendalian</h5></div></div>
                    <div className="row">
                        {[
                            {
                                label: 'Existing Control',
                                value: analisisRisiko?.attachment?.length,
                                path: 'existing-control'
                            },
                            {
                                label: 'Risk Treatment Plan (RTP)',
                                value: analisisRisiko?.pengendalian?.totalRtpCount,
                                path: 'rtp'
                            }
                        ].map(({ label, value, path }) => {
                            // Determine badge class based on value
                            let badgeClass = 'bg-light-danger text-danger';

                            if (label === 'Risk Treatment Plan (RTP)' && typeof value === 'string' && value.includes('/')) {
                                const [realized, total] = value.split('/').map(Number);
                                if (realized > 0) {
                                    badgeClass = realized === total ? 'bg-light-success text-success' : 'bg-light-warning text-warning';
                                }
                            } else if (value > 0) {
                                badgeClass = 'bg-light-success text-success';
                            }

                            return (
                                <div className="col-3" key={label}>
                                    <div className="mb-4">
                                        <label className="form-label">{label}</label>
                                        <div className="d-flex align-items-center">
                                            <span className={`badge ${badgeClass} rounded-4 p-2 w-100 d-flex justify-content-between align-items-center`}>
                                                <span className="ms-3 fs-5 text-center">{value ?? '0'}</span>
                                                <button className="btn btn-sm btn-primary ms-2" onClick={() => handleNavigateTo(path)}>
                                                    <FiEdit3 size={16} />
                                                </button>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                        }
                    </div>
                    
                    {/* Comment Section */}
                    <div className="row mt-4">
                        <div className="col-12">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="fw-bold d-flex align-items-center m-0">
                                    <FiMessageSquare className="me-2" /> Komentar
                                </h5>
                                <button 
                                    className="btn btn-sm btn-outline-primary" 
                                    onClick={() => setComments([])}
                                    disabled={comments.length === 0}
                                    title="Refresh komentar"
                                >
                                    <i className="bi bi-arrow-clockwise me-1"></i> Refresh
                                </button>
                            </div>
                            
                            {/* Comment Type Selection - Twitter-like UI */}
                            <div className="card mb-3 border-0 shadow-sm">
                                <div className="card-body p-3">
                                    <div className="row">
                                        <div className="col-md-6 mb-md-0 mb-2">
                                            <div className="d-flex align-items-center">
                                                <label className="form-label mb-0 me-2 text-muted">Tipe:</label>
                                                <select 
                                                    className="form-select form-select-sm" 
                                                    value={commentType}
                                                    onChange={handleChangeCommentType}
                                                    style={{maxWidth: '200px'}}
                                                >
                                                    <option value="IDENTIFIKASI">Identifikasi Risiko</option>
                                                    <option value="ANALISIS">Analisis Risiko</option>
                                                    <option value="EVALUASI">Evaluasi Risiko</option>
                                                    <option value="RTP">Rencana Tindak Pengendalian</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="d-flex align-items-center">
                                                <label className="form-label mb-0 me-2 text-muted">Item:</label>
                                                <select 
                                                    className="form-select form-select-sm"
                                                    value={selectedRefId}
                                                    onChange={handleChangeRefId}
                                                    disabled={loadingRefOptions || refOptions.length === 0}
                                                >
                                                    {loadingRefOptions ? (
                                                        <option value="">Memuat...</option>
                                                    ) : refOptions.length === 0 ? (
                                                        <option value="">Tidak ada data</option>
                                                    ) : (
                                                        refOptions.map(option => (
                                                            <option key={option.id} value={option.id}>
                                                                {option.name}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <ContentLoaderWrapper loading={loadingComments} error={commentError}>
                                {/* Comment Form - Twitter-like UI */}
                                {canCreateComments && selectedRefId && (
                                    <div className="card mb-3 border-0 shadow-sm">
                                        <div className="card-body p-3">
                                            <div className="d-flex">
                                                <div className="flex-shrink-0">
                                                    <div className="avatar-circle bg-primary text-white">
                                                        {user?.nama_depan?.charAt(0) || 'U'}
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1 ms-3">
                                                    <textarea 
                                                        className="form-control" 
                                                        rows="3" 
                                                        placeholder="Tambahkan komentar..."
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                    ></textarea>
                                                    <div className="d-flex justify-content-end mt-2">
                                                        <button 
                                                            className="btn btn-primary px-4" 
                                                            onClick={handleSubmitComment}
                                                            disabled={!newComment.trim()}
                                                        >
                                                            <FiSend className="me-1" /> Kirim
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Comments List - Twitter-like UI */}
                                {selectedRefId ? (
                                    comments.length > 0 ? (
                                        <div className="comments-container">
                                            {comments.map(comment => (
                                                <div key={comment.id} className="card mb-3 border-0 shadow-sm">
                                                    <div className="card-body p-3">
                                                        <div className="d-flex">
                                                            <div className="flex-shrink-0">
                                                                <div className="avatar-circle bg-secondary text-white">
                                                                    {comment.nama_user?.charAt(0) || 'U'}
                                                                </div>
                                                            </div>
                                                            <div className="flex-grow-1 ms-3">
                                                                <div className="d-flex justify-content-between align-items-center">
                                                                    <div>
                                                                        <span className="fw-bold">{comment.nama_user}</span>
                                                                        <span className="text-muted ms-2 small">
                                                                            {new Date(comment.created_at).toLocaleString('id-ID', {
                                                                                year: 'numeric',
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </span>
                                                                        <span className={`badge ms-2 ${comment.status === 'OPEN' ? 'bg-success' : 'bg-secondary'}`}>
                                                                            {comment.status}
                                                                        </span>
                                                                    </div>
                                                                    <div className="action-buttons">
                                                                        {/* Comment actions - Horizontal layout */}
                                                                        {canCloseComments && (
                                                                            <button 
                                                                                className={`btn btn-sm ${comment.status === 'OPEN' ? 'btn-outline-secondary' : 'btn-outline-success'} me-2`}
                                                                                onClick={() => handleToggleCommentStatus(comment.id, comment.status)}
                                                                                title={comment.status === 'OPEN' ? "Tutup komentar" : "Buka komentar"}
                                                                            >
                                                                                {comment.status === 'OPEN' ? 
                                                                                    <><FiLock size={14} className="me-1" /> Tutup</> : 
                                                                                    <><FiUnlock size={14} className="me-1" /> Buka</>}
                                                                            </button>
                                                                        )}
                                                                        
                                                                        {(user && (user.id === comment.user_id || user.role === 'SUPER_ADMIN')) && (
                                                                            <button 
                                                                                className="btn btn-sm btn-outline-danger"
                                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                                title="Hapus komentar"
                                                                            >
                                                                                <FiTrash2 size={14} className="me-1" /> Hapus
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className="mt-2 mb-3">{comment.konten}</p>
                                                                
                                                                {/* Reply Form - Twitter-like UI */}
                                                                {comment.status === 'OPEN' && canReply && (
                                                                    <div className="reply-form mb-3">
                                                                        <div className="input-group">
                                                                            <input 
                                                                                type="text" 
                                                                                className="form-control"
                                                                                placeholder="Balas komentar..."
                                                                                value={newReply[comment.id] || ''}
                                                                                onChange={(e) => setNewReply({...newReply, [comment.id]: e.target.value})}
                                                                            />
                                                                            <button 
                                                                                className="btn btn-outline-primary" 
                                                                                onClick={() => handleSubmitReply(comment.id)}
                                                                                disabled={!newReply[comment.id]?.trim()}
                                                                            >
                                                                                <FiSend size={14} className="me-1" /> Balas
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Replies - Twitter-like UI */}
                                                                {comment.replies && comment.replies.length > 0 && (
                                                                    <div className="replies-container mt-3 border-start border-2 ps-3">
                                                                        {comment.replies.map(reply => (
                                                                            <div key={reply.id} className="d-flex mb-3">
                                                                                <div className="flex-shrink-0">
                                                                                    <div className="avatar-circle-sm bg-light-secondary text-secondary">
                                                                                        {reply.nama_user?.charAt(0) || 'U'}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-grow-1 ms-2">
                                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                                        <div>
                                                                                            <span className="fw-bold small">{reply.nama_user}</span>
                                                                                            <span className="text-muted ms-1 small">
                                                                                                {new Date(reply.created_at).toLocaleString('id-ID', {
                                                                                                    year: 'numeric',
                                                                                                    month: 'short',
                                                                                                    day: 'numeric',
                                                                                                    hour: '2-digit',
                                                                                                    minute: '2-digit'
                                                                                                })}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div>
                                                                                            {(user && (user.id === reply.user_id || user.role === 'SUPER_ADMIN')) && (
                                                                                                <button 
                                                                                                    className="btn btn-sm btn-outline-danger"
                                                                                                    onClick={() => handleDeleteComment(reply.id)}
                                                                                                    title="Hapus balasan"
                                                                                                >
                                                                                                    <FiTrash2 size={14} /> Hapus
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <p className="mb-0 mt-1">{reply.konten}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="alert alert-info py-3 text-center">
                                            <i className="bi bi-chat-left-text me-2"></i>
                                            Belum ada komentar untuk {commentType.toLowerCase()} ini.
                                        </div>
                                    )
                                ) : (
                                    <div className="alert alert-warning py-3 text-center">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        Pilih {commentType.toLowerCase()} terlebih dahulu untuk melihat komentar.
                                    </div>
                                )}
                            </ContentLoaderWrapper>
                        </div>
                    </div>
                    
                    {/* Add CSS for avatars */}
                    <style jsx="true">{`
                        .avatar-circle {
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                        }
                        .avatar-circle-sm {
                            width: 30px;
                            height: 30px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            font-size: 0.8rem;
                        }
                        .bg-light-secondary {
                            background-color: #e9ecef;
                        }
                    `}</style>
                </ContentLoaderWrapper>
            </div>
        </div>
    );
};

IdentifikasiRisikoEditContent.propTypes = {
    title: PropTypes.string,
};

export default IdentifikasiRisikoEditContent;
