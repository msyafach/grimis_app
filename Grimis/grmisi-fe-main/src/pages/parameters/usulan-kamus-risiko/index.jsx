import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import { useAuth } from '@/context/AuthContext';
import { useInstansi } from '@/context/InstansiContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import { showToast } from '@/utils/toast';

const UsulanKamusRisiko = () => {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProposal, setSelectedProposal] = useState(null);

    const { user } = useAuth();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN_KLP';
    const isPemilikPengelola = user?.role === 'PEMILIK_RISIKO' || user?.role === 'PENGELOLA_RISIKO';

    // Fetch kamus risiko proposals
    const fetchProposals = async () => {
        if (!idInstansi) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');

            let url = API_ENDPOINTS.getKamusRisikoAll(idInstansi);
            if (idIndukUnitKerja) {
                url = API_ENDPOINTS.getKamusRisikoByIndukUnitKerja(idInstansi, idIndukUnitKerja);
            }

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Filter proposals for Pemilik/Pengelola - only show their own submissions
            let filteredData = response.data || [];
            if (isPemilikPengelola && !isAdmin) {
                // For non-admin, we need to filter by user who created
                // Since the API doesn't return created_by, we'll show all pending proposals
                // In a real scenario, you might want to add created_by field to the backend
                filteredData = filteredData.filter(p =>
                    p.status_approval === 'MENUNGGU_VERIFIKASI' ||
                    p.status_approval === 'GAGAL_VERIFIKASI'
                );
            }

            setProposals(filteredData);
            setError(null);
        } catch (err) {
            setError('Gagal memuat data usulan kamus risiko. Silakan coba lagi.');
            console.error('Error fetching proposals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProposals();
    }, [idInstansi, idIndukUnitKerja]);

    const handleDeleteClick = (proposal) => {
        setSelectedProposal(proposal);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!selectedProposal) return;

        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(API_ENDPOINTS.deleteKamusRisiko(selectedProposal.id), {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('success', 'Usulan kamus risiko berhasil dihapus');
            setShowDeleteModal(false);
            setSelectedProposal(null);
            fetchProposals();
        } catch (err) {
            showToast('error', 'Gagal menghapus usulan. ' + (err.response?.data?.detail || 'Silakan coba lagi.'));
            console.error('Error deleting:', err);
        }
    };

    const filteredProposals = useMemo(() => {
        return (Array.isArray(proposals) ? proposals : []).filter((p) =>
            p.kode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.nama_kategori?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.nama_klp?.toLowerCase().includes(searchTerm.toLowerCase())
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

    const renderDeleteModal = () => {
        if (!showDeleteModal || !selectedProposal) return null;

        return (
            <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Konfirmasi Hapus</h5>
                            <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
                        </div>
                        <div className="modal-body">
                            <p>Apakah Anda yakin ingin menghapus usulan kamus risiko ini?</p>
                            <div className="alert alert-light border">
                                <strong>Kode:</strong> {selectedProposal.kode}<br/>
                                <strong>Nama:</strong> {selectedProposal.nama}<br/>
                                <strong>Kategori:</strong> {selectedProposal.nama_kategori}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Batal</button>
                            <button type="button" className="btn btn-danger" onClick={handleDelete}>Hapus</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <PageHeader title="Usulan Kamus Risiko" />
            <div className="main-content">
                <div className="card p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4 className="mb-1">Daftar Usulan Kamus Risiko</h4>
                            <p className="text-muted mb-0">
                                {isPemilikPengelola && !isAdmin
                                    ? 'Lihat dan kelola usulan kamus risiko yang telah Anda ajukan'
                                    : 'Kelola usulan kamus risiko yang menunggu persetujuan'}
                            </p>
                        </div>
                        <a href="#/parameters/kamus-risiko/tambah" className="btn btn-primary">
                            <i className="fas fa-plus me-2"></i>Tambah Usulan
                        </a>
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Cari berdasarkan kode, nama, kategori, atau KLP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    {!idInstansi && (
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
                                        <th>Kode</th>
                                        <th>Nama Risiko</th>
                                        <th>Kategori</th>
                                        <th>KLP</th>
                                        <th>Status Approval</th>
                                        <th>Catatan</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProposals.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-4">
                                                Tidak ada usulan kamus risiko yang ditemukan
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProposals.map((p) => (
                                            <tr key={p.id}>
                                                <td>{p.kode}</td>
                                                <td>{p.nama}</td>
                                                <td>{p.nama_kategori || '-'}</td>
                                                <td>{p.nama_klp || '-'}</td>
                                                <td>{getStatusBadge(p.status_approval)}</td>
                                                <td>{p.catatan_approval || '-'}</td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        {/* Show delete button only for pending proposals */}
                                                        {(p.status_approval === 'MENUNGGU_VERIFIKASI' || p.status_approval === 'GAGAL_VERIFIKASI') && (
                                                            <button
                                                                className="btn btn-sm btn-danger"
                                                                onClick={() => handleDeleteClick(p)}
                                                                title="Hapus Usulan"
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
            {renderDeleteModal()}
        </>
    );
};

export default UsulanKamusRisiko;
