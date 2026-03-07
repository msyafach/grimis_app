import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Badge, Spinner, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import { showToast } from '@/utils/toast';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import { useAuth } from '@/context/AuthContext';
import CardHeader from '@/components/shared/CardHeader';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import { FiArrowLeft, FiEdit } from 'react-icons/fi';

const MonitoringRisikoDetail = () => {
  const { monitoringId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchMonitoringDetail();
  }, [monitoringId, refreshKey]);

  const fetchMonitoringDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('access_token');
      
      const response = await axios.get(API_ENDPOINTS.getMonitoringRisikoById(monitoringId), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching monitoring detail:', error);
      const errorMessage = error.response?.data?.detail || 'Gagal memuat detail monitoring risiko';
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('access_token');
      
      await axios.post(
        API_ENDPOINTS.verifyMonitoringRisiko(monitoringId, verifyStatus),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showToast('success', `Laporan berhasil ${verifyStatus === 'VERIFIED' ? 'diverifikasi' : 'ditolak'}`);
      setShowVerifyModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error verifying monitoring:', error);
      const errorMessage = error.response?.data?.detail || `Gagal ${verifyStatus === 'VERIFIED' ? 'memverifikasi' : 'menolak'} laporan`;
      showToast('error', errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Format skor dampak to show only the name without the score value
  const formatSkorDampak = (skorDampakText) => {
    if (!skorDampakText) return '-';
    // Extract just the name part (before the parenthesis)
    const match = skorDampakText.match(/^([^(]+)/);
    return match ? match[1].trim() : skorDampakText;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <Badge bg="warning">Menunggu Review</Badge>;
      case 'VERIFIED':
        return <Badge bg="success">Terverifikasi</Badge>;
      case 'REJECTED':
        return <Badge bg="danger">Ditolak</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const renderRiskLevel = (skor_dampak) => {
    if (!skor_dampak) return '-';
    
    let color = 'secondary';
    if (skor_dampak <= 1) color = 'success';
    else if (skor_dampak <= 3) color = 'warning';
    else color = 'danger';
    
    return <Badge bg={color}>{skor_dampak}</Badge>;
  };

  // Check if user can verify (SUPER_ADMIN or ADMIN_KLP)
  const canVerify = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_KLP') && data && data.status === 'PENDING';
  
  // Check if user can edit (SUPER_ADMIN or PENGELOLA_RISIKO)
  const canEdit = user && (user.role === 'SUPER_ADMIN' || user.role === 'PENGELOLA_RISIKO');

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleBack = () => {
    navigate('/pengelolaan-risiko/monitoring-risiko');
  };
  
  const handleEdit = () => {
    navigate(`/pengelolaan-risiko/monitoring-risiko/edit/${monitoringId}`);
  };

  return (
    <>
      <PageHeader>
        <div className="page-title">
        </div>
      </PageHeader>
      <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div className='row'>
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <Button 
                variant="light" 
                size="sm"
                className="d-flex align-items-center gap-2"
                onClick={handleBack}
              >
                <FiArrowLeft size={16} />
                <span>Kembali ke Daftar</span>
              </Button>
              
              {canEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  className="d-flex align-items-center gap-2"
                  onClick={handleEdit}
                >
                  <FiEdit size={16} />
                  <span>Edit</span>
                </Button>
              )}
            </div>

            <ContentLoaderWrapper loading={loading} error={error}>
              {data && (
                <Card className="card">
                  <CardHeader 
                    title={
                      <div>
                        <h5 className="mb-0">Detail Monitoring Risiko</h5>
                      </div>
                    }
                    refresh={handleRefresh}
                    expanded={false}
                    remove={null}
                    extra={
                      canVerify && (
                        <div className="d-flex gap-2">
                          <Button 
                            variant="success" 
                            size="sm"
                            onClick={() => {
                              setVerifyStatus('VERIFIED');
                              setShowVerifyModal(true);
                            }}
                          >
                            Verifikasi
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => {
                              setVerifyStatus('REJECTED');
                              setShowVerifyModal(true);
                            }}
                          >
                            Tolak
                          </Button>
                        </div>
                      )
                    }
                  />
                  
                  <div className="card-body">
                    <Row className="mb-4">
                      <Col md={12}>
                        <div className="mb-2">
                          <h5 className="mb-0">{data.nama_kejadian}</h5>
                        </div>
                      </Col>
                    </Row>

                    <Card className="border">
                      <Card.Header className="py-2 bg-light">
                        <h6 className="mb-0">Informasi Monitoring Risiko</h6>
                      </Card.Header>
                      <Card.Body>
                        <table className="table table-borderless">
                          <tbody>
                            <tr>
                              <td width="25%"><strong>Pernyataan Risiko</strong></td>
                              <td>{data.nama}</td>
                            </tr>
                            <tr>
                              <td><strong>Triwulan Kejadian</strong></td>
                              <td>{data.triwulan_periode_kejadian_nama}</td>
                            </tr>
                            <tr>
                              <td><strong>Nama Kejadian</strong></td>
                              <td>{data.nama_kejadian}</td>
                            </tr>
                            <tr>
                              <td><strong>Nama Penyebab</strong></td>
                              <td>{data.nama_penyebab || '-'}</td>
                            </tr>
                            <tr>
                              <td><strong>Tempat Kejadian</strong></td>
                              <td>{data.tempat_kejadian}</td>
                            </tr>
                            <tr>
                              <td><strong>Waktu Kejadian</strong></td>
                              <td>{formatDate(data.waktu_kejadian)}</td>
                            </tr>
                            <tr>
                              <td><strong>Skor Dampak</strong></td>
                              <td>{formatSkorDampak(data.skor_dampak_text)}</td>
                            </tr>
                            <tr>
                              <td><strong>Pemicu Kejadian</strong></td>
                              <td style={{ whiteSpace: 'pre-line' }}>{data.pemicu_kejadian}</td>
                            </tr>
                          </tbody>
                        </table>
                      </Card.Body>
                    </Card>
                    
                    {data.updated_by_name && (
                      <Row className="mt-4">
                        <Col md={12}>
                          <Card className="border">
                            <Card.Header className="py-2 bg-light">
                              <h6 className="mb-0">Informasi Verifikasi</h6>
                            </Card.Header>
                            <Card.Body>
                              <table className="table table-borderless">
                                <tbody>
                                  <tr>
                                    <td width="25%"><strong>Diverifikasi Oleh</strong></td>
                                    <td>{data.updated_by_name}</td>
                                  </tr>
                                  <tr>
                                    <td><strong>Tanggal Verifikasi</strong></td>
                                    <td>{formatDate(data.updated_at)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    )}
                  </div>
                </Card>
              )}
            </ContentLoaderWrapper>
          </div>
        </div>
      </div>
      <Footer />

      {/* Verification Modal */}
      <Modal show={showVerifyModal} onHide={() => setShowVerifyModal(false)} backdrop="static" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {verifyStatus === 'VERIFIED' ? 'Verifikasi' : 'Tolak'} Laporan
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Apakah Anda yakin ingin {verifyStatus === 'VERIFIED' ? 'memverifikasi' : 'menolak'} laporan kejadian ini?
          </p>
          <p className="mb-0">
            <strong>Catatan:</strong> Tindakan ini tidak dapat dibatalkan.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light-secondary" onClick={() => setShowVerifyModal(false)} disabled={processing}>
            Batal
          </Button>
          <Button 
            variant={verifyStatus === 'VERIFIED' ? 'success' : 'danger'} 
            onClick={handleVerify}
            disabled={processing}
          >
            {processing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Memproses...
              </>
            ) : (
              verifyStatus === 'VERIFIED' ? 'Verifikasi' : 'Tolak'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default MonitoringRisikoDetail; 