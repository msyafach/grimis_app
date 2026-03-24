import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import { useAuth } from '@/context/AuthContext';

const UsulanIndikator = () => {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedProposal, setSelectedProposal] = useState(null);
    const [konteksList, setKonteksList] = useState([]);
    const [instansiId, setInstansiId] = useState('');
    const [formData, setFormData] = useState({
        kode: '',
        nama: '',
        id_konteks: '',
        nama_konteks: ''
    });
    const [approvalData, setApprovalData] = useState({
        status_approval: 'TERVERIFIKASI',
        catatan: ''
    });

    const { user } = useAuth();
    const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN_KLP';

    // Get instansi ID from user
    useEffect(() => {
        if (user?.instansi_id || user?.last_instansi_id) {
            setInstansiId(user.instansi_id || user.last_instansi_id);
        }
    }, [user]);

    // Fetch indicator proposals
    const fetchProposals = async () => {
        if (!instansiId) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/indikator?id_instansi=${instansiId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setProposals(response.data);
            setError(null);
        } catch (err) {
            setError('Gagal memuat data usulan indikator. Silakan coba lagi.');
            console.error('Error fetching proposals:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch SASARAN konteks
    const fetchKonteksSasaran = async () => {
        if (!instansiId) return;

        try {
            const token = localStorage.getItem('access_token');
            // Get struktur organisasi to find SASARAN contexts
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/struktur-organisasi?id_instansi=${instansiId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Extract SASARAN type konteks
            const strukturList = response.data || [];
            const sasaranKonteks = [];

            for (const struktur of strukturList) {
                const jenisKonteks = struktur.jenis_konteks || [];
                for (const jk of jenisKonteks) {
                    if (jk.jenis === 'SASARAN') {
                        // Fetch actual konteks for this jenis
                        const konteksResponse = await axios.get(
                            `${API_BASE_URL}/api/v1/konteks?id_jenis_konteks=${jk.id}&id_instansi=${instansiId}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        sasaranKonteks.push(...(konteksResponse.data || []));
                    }
                }
            }

            setKonteksList(sasaranKonteks);
        } catch (err) {
            console.error('Error fetching konteks:', err);
        }
    };

    useEffect(() => {
        fetchProposals();
    }, [instansiId]);

    const handleCreate = () => {
        setSelectedProposal(null);
        setFormData({ kode: '', nama: '', id_konteks: '', nama_konteks: '' });
        fetchKonteksSasaran();
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('access_token');
            await axios.post(API_ENDPOINTS.postIndikator, {
                ...formData,
                id_instansi: instansiId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            fetchProposals();
        } catch (err) {
            alert('Gagal menyimpan usulan indikator. ' + (err.response?.data?.detail || 'Silakan coba lagi.'));
            console.error('Error saving proposal:', err);
        }
    };

    const handleApproveClick = (proposal) => {
        setSelectedProposal(proposal);
        setApprovalData({ status_approval: 'TERVERIFIKASI', catatan: '' });
        setShowApproveModal(true);
    };

    const handleApprove = async () => {
        try {
            const token = localStorage.getItem('access_token');
            await axios.post(
                API_ENDPOINTS.approveIndikator(selectedProposal.id),
                approvalData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setShowApproveModal(false);
            fetchProposals();
        } catch (err) {
            alert('Gagal melakukan approval. ' + (err.response?.data?.detail || 'Silakan coba lagi.'));
            console.error('Error approving:', err);
        }
    };

    const handleDelete = async (proposalId) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus usulan ini?')) {
            return;
        }
        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(API_ENDPOINTS.deleteIndikator(proposalId), {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchProposals();
        } catch (err) {
            alert('Gagal menghapus usulan.');
            console.error('Error deleting:', err);
        }
    };

    const filteredProposals = useMemo(() => {
        return (Array.isArray(proposals) ? proposals : []).filter((p) =>
            p.kode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.nama_konteks?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [proposals, searchTerm]);

    const getStatusBadge = (status) => {
        const statusConfig = {
            'MENUNGGU_VERIFIKASI': { label: 'Menunggu Verifikasi', class: 'bg-warning text-dark' },
            'GAGAL_VERIFIKASI': { label: 'Gagal Verifikasi', class: 'bg-danger' },
            'TERVERIFIKASI': { label: 'Terverifikasi', class: 'bg-success' },
            'DISETUJUI_DENGAN_PENYESUAIAN': { label: 'Disetujui dengan Penyesuaian', class: 'bg-info' }
        };
        const config = statusConfig[status] || { label: status, class: 'bg-secondary' };
        return <span className={`badge ${config.class}`}>{config.label}</span>;
    };

    const renderModal = () => {
        if (!showModal) return null;

        return (
            <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Tambah Usulan Indikator</h5>
                            <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Konteks Sasaran *</label>
                                    <select
                                        className="form-select"
                                        value={formData.id_konteks}
                                        onChange={(e) => {
                                            const selected = konteksList.find(k => k.id === e.target.value);
                                            setFormData({
                                                ...formData,
                                                id_konteks: e.target.value,
                                                nama_konteks: selected?.nama || ''
                                            });
                                        }}
                                        required
                                    >
                                        <option value="">Pilih Konteks Sasaran</option>
                                        {konteksList.map((k) => (
                                            <option key={k.id} value={k.id}>{k.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Kode *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Contoh: SP 00.10.01"
                                        value={formData.kode}
                                        onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Nama Indikator *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Contoh: Indeks Reputasi"
                                        value={formData.nama}
                                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    const renderApproveModal = () => {
        if (!showApproveModal || !selectedProposal) return null;

        return (
            <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Approval Usulan Indikator</h5>
                            <button type="button" className="btn-close" onClick={() => setShowApproveModal(false)}></button>
                        </div>
                        <div className="modal-body">
                            <div className="mb-3">
                                <p><strong>Kode:</strong> {selectedProposal.kode}</p>
                                <p><strong>Nama:</strong> {selectedProposal.nama}</p>
                                <p><strong>Konteks:</strong> {selectedProposal.nama_konteks}</p>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Status Approval *</label>
                                <select
                                    className="form-select"
                                    value={approvalData.status_approval}
                                    onChange={(e) => setApprovalData({ ...approvalData, status_approval: e.target.value })}
                                    required
                                >
                                    <option value="TERVERIFIKASI">Terverifikasi</option>
                                    <option value="GAGAL_VERIFIKASI">Gagal Verifikasi</option>
                                    <option value="DISETUJUI_DENGAN_PENYESUAIAN">Disetujui dengan Penyesuaian</option>
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Catatan</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    placeholder="Tambahkan catatan jika diperlukan..."
                                    value={approvalData.catatan}
                                    onChange={(e) => setApprovalData({ ...approvalData, catatan: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowApproveModal(false)}>Batal</button>
                            <button type="button" className="btn btn-primary" onClick={handleApprove}>Simpan Approval</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <PageHeader title="Usulan Indikator" />
            <div className="main-content">
                <div className="card p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4 className="mb-1">Daftar Usulan Indikator</h4>
                            <p className="text-muted mb-0">Kelola usulan indikator kinerja yang belum tersedia</p>
                        </div>
                        <button className="btn btn-primary" onClick={handleCreate}>
                            <i className="fas fa-plus me-2"></i>Tambah Usulan
                        </button>
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Cari berdasarkan kode, nama, atau konteks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    {!instansiId && (
                        <div className="alert alert-warning" role="alert">
                            Silakan pilih instansi terlebih dahulu
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Konteks</th>
                                        <th>Kode</th>
                                        <th>Nama Indikator</th>
                                        <th>Status Approval</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProposals.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4">
                                                Tidak ada usulan indikator yang ditemukan
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProposals.map((p) => (
                                            <tr key={p.id}>
                                                <td>{p.nama_konteks || '-'}</td>
                                                <td>{p.kode}</td>
                                                <td>{p.nama}</td>
                                                <td>{getStatusBadge(p.status_approval)}</td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        {isAdmin && p.status_approval === 'MENUNGGU_VERIFIKASI' && (
                                                            <button
                                                                className="btn btn-sm btn-success"
                                                                onClick={() => handleApproveClick(p)}
                                                                title="Approve"
                                                            >
                                                                <i className="fas fa-check"></i>
                                                            </button>
                                                        )}
                                                        {(p.status_approval === 'MENUNGGU_VERIFIKASI' || !isAdmin) && (
                                                            <button
                                                                className="btn btn-sm btn-danger"
                                                                onClick={() => handleDelete(p.id)}
                                                                title="Hapus"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
            {renderModal()}
            {renderApproveModal()}
        </>
    );
};

export default UsulanIndikator;
