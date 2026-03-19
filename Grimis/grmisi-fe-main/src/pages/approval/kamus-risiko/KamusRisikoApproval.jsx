import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge, Dropdown } from 'react-bootstrap';
import { FaSync, FaCheckCircle, FaTimesCircle, FaEdit } from 'react-icons/fa';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_ENDPOINTS from '@/config/apiConfig';
import { useInstansi } from '@/context/InstansiContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/utils/toast';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import Table from '@/components/shared/table/Table';
import ApproveKamusModal from '@/components/approval/kamusRisiko/ApproveKamusModal';

const KamusRisikoApproval = () => {
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();
  const { idInstansi } = useInstansi();
  const { idIndukUnitKerja } = useIndukUnitKerja();
  const { user } = useAuth();

  // State for modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState(null);

  useEffect(() => {
    fetchProposals();
  }, [idInstansi, idIndukUnitKerja]);

  const fetchProposals = async () => {
    if (!idInstansi) {
      showToast('error', 'Silakan pilih instansi terlebih dahulu');
      setProposals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      let url = `${API_ENDPOINTS.getKamusRisiko}?id_instansi=${idInstansi}`;
      if (idIndukUnitKerja) {
        url += `&id_induk_unit_kerja=${idIndukUnitKerja}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        // Filter only proposals with MENUNGGU_VERIFIKASI status or all for viewing
        setProposals(response.data);
      }
    } catch (error) {
      console.error('Error fetching kamus risiko proposals:', error);
      showToast('error', 'Gagal memuat data usulan kamus risiko');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action, id) => {
    switch (action) {
      case 'approve':
        setSelectedProposalId(id);
        setShowApproveModal(true);
        break;
      case 'reject':
        handleReject(id);
        break;
      case 'edit':
        navigate(`/parameters/kamus-risiko/edit/${id}`);
        break;
      default:
        break;
    }
  };

  const handleReject = async (id, catatan = '') => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_ENDPOINTS.postKamusRisiko}/${id}/approve?status_approval=GAGAL_VERIFIKASI&catatan=${encodeURIComponent(catatan)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('success', 'Usulan kamus risiko berhasil ditolak');
      fetchProposals();
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      showToast('error', 'Gagal menolak usulan kamus risiko');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveModalClose = () => {
    setShowApproveModal(false);
    setSelectedProposalId(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'MENUNGGU_VERIFIKASI':
        return <Badge bg="warning">Menunggu Proses Verifikasi</Badge>;
      case 'GAGAL_VERIFIKASI':
        return <Badge bg="danger">Gagal Verifikasi</Badge>;
      case 'TERVERIFIKASI':
        return <Badge bg="success">Terverifikasi</Badge>;
      case 'DISETUJUI_DENGAN_PENYESUAIAN':
        return <Badge bg="info">Disetujui dengan Penyesuaian</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getAvailableActions = (item) => {
    let actions = [];
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";

    if (isAdmin) {
      // Admin can approve/reject only if status is MENUNGGU_VERIFIKASI
      if (item.status_approval === 'MENUNGGU_VERIFIKASI') {
        actions.push(
          { label: "Terima", key: "approve", icon: <FaCheckCircle className="text-success" /> },
          { label: "Tolak", key: "reject", icon: <FaTimesCircle className="text-danger" /> }
        );
      }
      // Admin can edit terverifikasi proposals
      if (item.status_approval === 'TERVERIFIKASI' || item.status_approval === 'DISETUJUI_DENGAN_PENYESUAIAN') {
        actions.push(
          { label: "Edit", key: "edit", icon: <FaEdit className="text-primary" /> }
        );
      }
    }

    return actions;
  };

  // Define columns for the Table component
  const columns = useMemo(() => [
    {
      header: 'Tindakan',
      accessorKey: 'actions',
      cell: ({ row }) => {
        const item = row.original;
        const actions = getAvailableActions(item);

        if (actions.length === 0) return null;

        return (
          <Dropdown>
            <Dropdown.Toggle variant="light" size="sm" className="btn-action">
              <i className="fas fa-ellipsis-v"></i>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {actions.map((action) => (
                <Dropdown.Item
                  key={action.key}
                  onClick={() => handleAction(action.key, item.id)}
                  className="d-flex align-items-center gap-2"
                  disabled={actionLoading}
                >
                  {action.icon} {action.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        );
      },
      meta: {
        className: 'text-center',
        headerClassName: 'text-center'
      }
    },
    {
      header: 'Kode',
      accessorKey: 'kode'
    },
    {
      header: 'Nama Risiko',
      accessorKey: 'nama'
    },
    {
      header: 'Kategori',
      accessorKey: 'nama_kategori'
    },
    {
      header: 'KLP',
      accessorKey: 'nama_klp'
    },
    {
      header: 'Status Approval',
      accessorKey: 'status_approval',
      cell: ({ getValue }) => getStatusBadge(getValue())
    },
    {
      header: 'Catatan',
      accessorKey: 'catatan_approval',
      cell: ({ getValue }) => getValue() || '-'
    }
  ], [actionLoading, user]);

  // Filter proposals - show only those awaiting verification for admin
  const filteredProposals = useMemo(() => {
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";
    if (isAdmin) {
      // Admin sees all proposals for verification
      return proposals;
    }
    // Pemilik/Pengelola only see their own proposals
    return proposals;
  }, [proposals, user]);

  return (
    <div className="col-12">
      <ContentLoaderWrapper loading={loading} error="">
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center py-2">
            <h5 className="mb-0">Daftar Usulan Kamus Risiko</h5>
            <div>
              <Button
                variant="primary"
                size="sm"
                className="d-flex align-items-center gap-2"
                onClick={() => fetchProposals()}
                disabled={actionLoading}
              >
                <FaSync size={14} className={actionLoading ? "fa-spin" : ""} />
                <span>Refresh Data</span>
              </Button>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {filteredProposals.length === 0 ? (
              <div className="text-center py-5">
                <p className="mb-0">Belum ada usulan kamus risiko</p>
              </div>
            ) : (
              <Table
                data={filteredProposals}
                columns={columns}
              />
            )}
          </Card.Body>
        </Card>
      </ContentLoaderWrapper>

      {/* Approve Modal */}
      <ApproveKamusModal
        show={showApproveModal}
        onHide={handleApproveModalClose}
        proposalId={selectedProposalId}
        onSuccess={fetchProposals}
      />
    </div>
  );
};

export default KamusRisikoApproval;
