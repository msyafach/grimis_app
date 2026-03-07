import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge, Spinner, Dropdown } from 'react-bootstrap';
import { FaSync, FaCheckCircle, FaTimesCircle, FaDownload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import { useInstansi } from '@/context/InstansiContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import { useTahun } from '@/context/TahunContext';
import { showToast } from '@/utils/toast';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import Table from '@/components/shared/table/Table';
import ApproveModal from '@/components/laporanKejadian/ApproveModal';

const LaporanKejadianAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [laporan, setLaporan] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();
  const { idInstansi } = useInstansi();
  const { idIndukUnitKerja } = useIndukUnitKerja();
  const { tahunId } = useTahun();

  // State for modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedLaporanId, setSelectedLaporanId] = useState(null);

  useEffect(() => {
    fetchLaporanKejadian();
  }, [idInstansi, idIndukUnitKerja, tahunId]);

  const fetchLaporanKejadian = async () => {
    if (!idInstansi || !tahunId) {
      showToast('error', 'Silakan pilih instansi dan tahun terlebih dahulu');
      setLaporan([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      // Parameter tahun selalu dikirim
      let url = `${API_ENDPOINTS.getLaporanKejadian}?tahun=${tahunId}`;
      if (idInstansi) {
        url += `&id_instansi=${idInstansi}`;
        if (idIndukUnitKerja) {
          url += `&id_induk_unit_kerja=${idIndukUnitKerja}`;
        }
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setLaporan(response.data);
      }
    } catch (error) {
      console.error('Error fetching laporan kejadian:', error);
      showToast('error', 'Gagal memuat data laporan kejadian');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id, catatan = '') => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('access_token');
      await axios.post(
        API_ENDPOINTS.rejectLaporanKejadian(id),
        { catatan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('success', 'Laporan kejadian berhasil ditolak');
      fetchLaporanKejadian();
    } catch (error) {
      console.error('Error rejecting laporan kejadian:', error);
      showToast('error', 'Gagal menolak laporan kejadian');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <Badge bg="warning">Menunggu Review</Badge>;
      case 'VERIFIED':
        return <Badge bg="success">Diterima</Badge>;
      case 'REJECTED':
        return <Badge bg="danger">Ditolak</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleDownload = async (id) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        API_ENDPOINTS.downloadLaporanKejadianPdf(id),
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Extract filename from response headers if possible, otherwise fallback
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Laporan_Kejadian_${id}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('success', 'Laporan kejadian berhasil diunduh');
    } catch (error) {
      console.error('Error downloading laporan kejadian:', error);
      showToast('error', 'Gagal mengunduh laporan kejadian');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = (action, id) => {
    switch (action) {
      case 'approve':
        setSelectedLaporanId(id);
        setShowApproveModal(true);
        break;
      case 'reject':
        handleReject(id);
        break;
      case 'download':
        handleDownload(id);
        break;
      default:
        break;
    }
  };

  const handleApproveModalClose = () => {
    setShowApproveModal(false);
    setSelectedLaporanId(null);
  };

  const getAvailableActions = (item) => {
    let actions = [];

    // Only show approve/reject actions if status is PENDING
    if (item.status === 'PENDING') {
      actions.push(
        { label: "Terima", key: "approve", icon: <FaCheckCircle className="text-success" /> },
        { label: "Tolak", key: "reject", icon: <FaTimesCircle className="text-danger" /> }
      );
    }

    // Download PDF is always available
    actions.push(
      { label: "Unduh PDF", key: "download", icon: <FaDownload className="text-secondary" /> }
    );

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
                  onClick={() => handleAction(action.key, item._id || item.id)}
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
      header: 'Nama Lengkap',
      accessorFn: (row) => row.nama || 'Anonim'
    },
    {
      header: 'Email',
      accessorKey: 'email'
    },
    {
      header: 'No Handphone',
      accessorKey: 'no_hp'
    },
    {
      header: 'Nama Kejadian',
      accessorKey: 'nama_kejadian'
    },
    {
      header: 'Nama Penyebab',
      accessorFn: (row) => row.nama_penyebab || '-'
    },
    {
      header: 'Tempat Kejadian',
      accessorKey: 'tempat_kejadian'
    },
    {
      header: 'Waktu Kejadian',
      accessorKey: 'waktu_kejadian',
      cell: ({ getValue }) => formatDate(getValue())
    },
    {
      header: 'Pemicu Kejadian',
      accessorKey: 'pemicu_kejadian'
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => getStatusBadge(getValue())
    }
  ], [actionLoading]);

  return (
    <div className="col-12">
      <ContentLoaderWrapper loading={loading} error="">
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center py-2">
            <h5 className="mb-0">Daftar Laporan Kejadian {tahunId && `- Tahun ${tahunId}`}</h5>
            <div>
              <Button
                variant="primary"
                size="sm"
                className="d-flex align-items-center gap-2"
                onClick={() => fetchLaporanKejadian()}
                disabled={actionLoading}
              >
                <FaSync size={14} className={actionLoading ? "fa-spin" : ""} />
                <span>Refresh Data</span>
              </Button>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {laporan.length === 0 ? (
              <div className="text-center py-5">
                <p className="mb-0">Belum ada laporan kejadian</p>
              </div>
            ) : (
              <Table
                data={laporan}
                columns={columns}
              />
            )}
          </Card.Body>
        </Card>
      </ContentLoaderWrapper>

      {/* Approve Modal */}
      <ApproveModal
        show={showApproveModal}
        onHide={handleApproveModalClose}
        laporanId={selectedLaporanId}
        idInstansi={idInstansi}
        idIndukUnitKerja={idIndukUnitKerja}
        tahunId={tahunId}
        onSuccess={fetchLaporanKejadian}
      />
    </div>
  );
};

export default LaporanKejadianAdmin; 