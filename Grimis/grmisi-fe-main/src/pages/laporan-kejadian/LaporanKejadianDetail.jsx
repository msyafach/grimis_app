import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Badge, Spinner, Form } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import { showToast } from '@/utils/toast';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import { useInstansi } from '@/context/InstansiContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import { useTahun } from '@/context/TahunContext';
import ApproveModal from '@/components/laporanKejadian/ApproveModal';

const LaporanKejadianDetail = () => {
  const { laporanId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [laporan, setLaporan] = useState(null);
  const [error, setError] = useState('');
  const { idInstansi } = useInstansi();
  const { idIndukUnitKerja } = useIndukUnitKerja();
  const { tahunId } = useTahun();
  
  // State for risk identification and assessment
  const [riskStatements, setRiskStatements] = useState([]);
  const [selectedRiskStatement, setSelectedRiskStatement] = useState('');
  const [impactScores, setImpactScores] = useState([]);
  const [selectedImpactScore, setSelectedImpactScore] = useState('');
  const [loadingRisks, setLoadingRisks] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  
  // Fixed likelihood score
  const FIXED_LIKELIHOOD_SCORE = 1;

  useEffect(() => {
    fetchLaporanDetail();
  }, [laporanId]);

  useEffect(() => {
    if (laporan?.status === 'PENDING' && idInstansi && idIndukUnitKerja && tahunId) {
      fetchRiskStatements();
      fetchScoreOptions();
    }
  }, [laporan, idInstansi, idIndukUnitKerja, tahunId]);

  const fetchLaporanDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      let url = API_ENDPOINTS.getLaporanKejadianById(laporanId);
      if (tahunId) {
        url += `?tahun=${tahunId}`;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setLaporan(response.data);
      }
    } catch (error) {
      console.error('Error fetching laporan detail:', error);
      setError('Gagal memuat detail laporan');
      showToast('error', 'Gagal memuat detail laporan');
    } finally {
      setLoading(false);
    }
  };

  const fetchRiskStatements = async () => {
    try {
      setLoadingRisks(true);
      const token = localStorage.getItem('access_token');
      
      // Fetch risk statements directly from the laporan kejadian API with year parameter
      const response = await axios.get(
        `${API_ENDPOINTS.getLaporanKejadianKamusRisikoOptions(idInstansi, idIndukUnitKerja)}&tahun=${tahunId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.options) {
        console.log("Fetched risk statements:", response.data.options);
        setRiskStatements(response.data.options);
      } else {
        console.error("API response format unexpected:", response.data);
        showToast('error', 'Format respons API tidak sesuai harapan');
      }
    } catch (error) {
      console.error('Error fetching risk statements:', error);
      showToast('error', 'Gagal memuat data pernyataan risiko');
    } finally {
      setLoadingRisks(false);
    }
  };

  const fetchScoreOptions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Fetch kriteria from laporan kejadian API
      const response = await axios.get(
        API_ENDPOINTS.getLaporanKejadianKriteriaOptions(idInstansi, idIndukUnitKerja),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        console.log("Fetched criteria:", response.data);
        
        // Extract impact scores from API response
        if (response.data.dampak && Array.isArray(response.data.dampak)) {
          setImpactScores(response.data.dampak);
        } else {
          console.error("No impact criteria found in response");
        }
      }
    } catch (error) {
      console.error('Error fetching score options:', error);
      showToast('error', 'Gagal memuat data kriteria risiko');
    }
  };

  const handleApprove = async () => {
    if (!selectedRiskStatement) {
      showToast('error', 'Silakan pilih pernyataan risiko!');
      return;
    }
    if (!selectedImpactScore) {
      showToast('error', 'Silakan pilih skor dampak!');
      return;
    }
    
    const approvalData = {
      pernyataan_risiko_id: selectedRiskStatement,
      dampak_id: selectedImpactScore,
      kemungkinan_id: "1", // Fixed likelihood score of 1
      notes: approvalNotes
    };

    try {
      setProcessing(true);
      const token = localStorage.getItem('access_token');
      
      // Approve the incident report
      const approveResponse = await axios.post(
        API_ENDPOINTS.approveLaporanKejadian(laporanId),
        approvalData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (approveResponse.data) {
        showToast('success', 'Laporan berhasil disetujui dan terhubung dengan pernyataan risiko');
        fetchLaporanDetail();
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      showToast('error', 'Gagal menyetujui laporan');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('access_token');
      
      const response = await axios.post(
        API_ENDPOINTS.rejectLaporanKejadian(laporanId),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        showToast('success', 'Laporan berhasil ditolak');
        fetchLaporanDetail();
      }
    } catch (error) {
      console.error('Error rejecting laporan:', error);
      showToast('error', 'Gagal menolak laporan');
    } finally {
      setProcessing(false);
    }
  };

  // Function to get the numerical value of a selected impact score
  const getImpactValue = (scoreId) => {
    const score = impactScores.find(s => s.id === scoreId);
    return score ? parseFloat(score.nilai) : 0;
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

  // Approve Modal
  const [showApproveModal, setShowApproveModal] = useState(false);

  const handleApproveModalClose = () => {
    setShowApproveModal(false);
  };

  return (
    <div className="col-12">
      <ContentLoaderWrapper loading={loading} error={error}>
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">Detail Laporan Kejadian {tahunId && `- Tahun ${tahunId}`}</h5>
              <small className="text-muted">ID: {laporanId}</small>
            </div>
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={() => navigate('/approval/laporan-kejadian')}
            >
              Kembali
            </Button>
          </Card.Header>
          
          {laporan && (
            <Card.Body>
              <Row className="mb-4">
                <Col md={12}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="mb-0">{laporan.nama_kejadian}</h5>
                    {getStatusBadge(laporan.status)}
                  </div>
                  <p className="text-muted mb-0">
                    Dilaporkan pada {formatDate(laporan.created_at)}
                  </p>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={6}>
                  <Card className="h-100 border">
                    <Card.Header className="py-2 bg-light">
                      <h6 className="mb-0">Informasi Pelapor</h6>
                    </Card.Header>
                    <Card.Body>
                      <table className="table table-borderless">
                        <tbody>
                          <tr>
                            <td width="40%"><strong>Nama</strong></td>
                            <td>{laporan.nama || '-'}</td>
                          </tr>
                          <tr>
                            <td><strong>Email</strong></td>
                            <td>{laporan.email || '-'}</td>
                          </tr>
                          <tr>
                            <td><strong>No. Telepon</strong></td>
                            <td>{laporan.no_hp || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col md={6}>
                  <Card className="h-100 border">
                    <Card.Header className="py-2 bg-light">
                      <h6 className="mb-0">Informasi Kejadian</h6>
                    </Card.Header>
                    <Card.Body>
                      <table className="table table-borderless">
                        <tbody>
                          <tr>
                            <td width="40%"><strong>Tempat</strong></td>
                            <td>{laporan.tempat_kejadian}</td>
                          </tr>
                          <tr>
                            <td><strong>Waktu Kejadian</strong></td>
                            <td>{formatDate(laporan.waktu_kejadian)}</td>
                          </tr>
                          <tr>
                            <td><strong>Nama Penyebab</strong></td>
                            <td>{laporan.nama_penyebab || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={12}>
                  <Card className="border">
                    <Card.Header className="py-2 bg-light">
                      <h6 className="mb-0">Pemicu Kejadian</h6>
                    </Card.Header>
                    <Card.Body>
                      <p style={{ whiteSpace: 'pre-line' }}>{laporan.pemicu_kejadian}</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {laporan.status === 'PENDING' && (
                <>
                  <Row className="mb-4">
                    <Col md={12}>
                      <Card className="border border-warning">
                        <Card.Header className="py-2 bg-warning text-dark">
                          <h6 className="mb-0">Analisis Risiko</h6>
                        </Card.Header>
                        <Card.Body>
                          <ContentLoaderWrapper loading={loadingRisks} error="">
                            <Form>
                              <Form.Group className="mb-3">
                                <Form.Label><strong>Pilih Pernyataan Risiko</strong></Form.Label>
                                <Form.Select 
                                  value={selectedRiskStatement}
                                  onChange={(e) => setSelectedRiskStatement(e.target.value)}
                                  required
                                  className="text-dark"
                                  style={{ color: '#212529' }}
                                >
                                  <option value="">-- Pilih Pernyataan Risiko --</option>
                                  {riskStatements.map(risk => (
                                    <option key={risk.id} value={risk.id} className="text-dark">
                                      {risk.nama}
                                    </option>
                                  ))}
                                </Form.Select>
                                <Form.Text className="text-muted">
                                  Pilih pernyataan risiko yang terkait dengan kejadian ini
                                </Form.Text>
                              </Form.Group>
                              
                              <Form.Group className="mb-3">
                                <Form.Label><strong>Skor Dampak</strong></Form.Label>
                                <Form.Select
                                  value={selectedImpactScore}
                                  onChange={(e) => setSelectedImpactScore(e.target.value)}
                                  required
                                  className="text-dark"
                                  style={{ color: '#212529' }}
                                >
                                  <option value="">-- Pilih Skor Dampak --</option>
                                  {impactScores.map(score => (
                                    <option key={score.id} value={score.id} className="text-dark">
                                      {score.nilai} - {score.nama}
                                    </option>
                                  ))}
                                </Form.Select>
                                <Form.Text className="text-muted">
                                  Pilih nilai dampak dari kejadian ini terhadap pernyataan risiko
                                </Form.Text>
                              </Form.Group>
                              
                              {selectedImpactScore && (
                                <div className="d-flex align-items-center mt-3">
                                  <span className="me-2"><strong>Level Risiko:</strong></span>
                                  <Badge 
                                    bg={
                                      FIXED_LIKELIHOOD_SCORE * getImpactValue(selectedImpactScore) <= 4 
                                        ? 'success' 
                                        : FIXED_LIKELIHOOD_SCORE * getImpactValue(selectedImpactScore) <= 12 
                                          ? 'warning' 
                                          : 'danger'
                                    }
                                    className="fs-6 py-2 px-3"
                                  >
                                    {FIXED_LIKELIHOOD_SCORE * getImpactValue(selectedImpactScore)}
                                  </Badge>
                                </div>
                              )}
                              
                              <Form.Group className="mb-3 mt-3">
                                <Form.Label><strong>Catatan</strong></Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={3}
                                  value={approvalNotes}
                                  onChange={(e) => setApprovalNotes(e.target.value)}
                                  placeholder="Tambahkan catatan (opsional)"
                                />
                              </Form.Group>
                            </Form>
                          </ContentLoaderWrapper>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={12}>
                      <div className="d-flex gap-2 justify-content-end">
                        <Button 
                          variant="success" 
                          disabled={processing || !selectedRiskStatement || !selectedImpactScore}
                          onClick={() => setShowApproveModal(true)}
                        >
                          {processing ? <><Spinner animation="border" size="sm" /> <span className="ms-2">Memproses...</span></> : 'Terima Laporan'}
                        </Button>
                        
                        <Button 
                          variant="danger" 
                          disabled={processing}
                          onClick={handleReject}
                        >
                          {processing ? <><Spinner animation="border" size="sm" /> <span className="ms-2">Memproses...</span></> : 'Tolak Laporan'}
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </>
              )}

              {laporan.status === 'REJECTED' && laporan.catatan && (
                <Row>
                  <Col md={12}>
                    <Card className="border border-danger">
                      <Card.Header className="py-2 bg-danger text-white">
                        <h6 className="mb-0">Catatan Penolakan</h6>
                      </Card.Header>
                      <Card.Body>
                        <p>{laporan.catatan}</p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
            </Card.Body>
          )}
        </Card>
      </ContentLoaderWrapper>

      {/* Approve Modal */}
      <ApproveModal
        show={showApproveModal}
        onHide={handleApproveModalClose}
        laporanId={laporanId}
        idInstansi={idInstansi}
        idIndukUnitKerja={idIndukUnitKerja}
        tahunId={tahunId}
        onSuccess={fetchLaporanDetail}
      />
    </div>
  );
};

export default LaporanKejadianDetail; 