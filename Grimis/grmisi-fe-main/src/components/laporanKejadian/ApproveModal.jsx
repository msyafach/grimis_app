import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Badge, Spinner } from 'react-bootstrap';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import { showToast } from '@/utils/toast';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';

const ApproveModal = ({ show, onHide, laporanId, idInstansi, idIndukUnitKerja, tahunId, onSuccess }) => {
  // State for risk identification and assessment
  const [riskStatements, setRiskStatements] = useState([]);
  const [impactScores, setImpactScores] = useState([]);
  const [selectedRiskStatement, setSelectedRiskStatement] = useState('');
  const [selectedImpactScore, setSelectedImpactScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Fixed likelihood score
  const FIXED_LIKELIHOOD_SCORE = 1;

  useEffect(() => {
    if (show && idInstansi && idIndukUnitKerja && tahunId) {
      fetchRiskStatements();
      fetchScoreOptions();
      // Reset selections when modal shows
      setSelectedRiskStatement('');
      setSelectedImpactScore('');
    }
  }, [show, idInstansi, idIndukUnitKerja, tahunId]);

  // Reset form when modal is closed
  useEffect(() => {
    if (!show) {
      setSelectedRiskStatement('');
      setSelectedImpactScore('');
      setNotes('');
    }
  }, [show]);

  const fetchRiskStatements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // Fetch risk statements directly from the laporan kejadian API with year parameter
      const response = await axios.get(
        `${API_ENDPOINTS.getLaporanKejadianKamusRisikoOptions(idInstansi, idIndukUnitKerja)}&tahun=${tahunId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.options) {
        console.log("Fetched risk statements:", response.data.options);
        // Log struktur data untuk debugging
        if (response.data.options.length > 0) {
          console.log("Sample risk statement structure:", JSON.stringify(response.data.options[0]));
        }
        setRiskStatements(response.data.options);
      } else {
        console.error("API response format unexpected:", response.data);
        showToast('error', 'Format respons API tidak sesuai harapan');
      }
    } catch (error) {
      console.error('Error fetching risk statements:', error);
      showToast('error', 'Gagal memuat data pernyataan risiko');
    } finally {
      setLoading(false);
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

  // Function to get the numerical value of a selected impact score
  const getImpactValue = (scoreId) => {
    const score = impactScores.find(s => s.id === scoreId);
    return score ? parseFloat(score.nilai) : 0;
  };

  // Calculate the risk level
  const calculateRiskLevel = () => {
    if (!selectedImpactScore) return null;
    
    const riskLevel = FIXED_LIKELIHOOD_SCORE * getImpactValue(selectedImpactScore);
    
    return {
      value: riskLevel,
      color: riskLevel <= 4 ? 'success' : riskLevel <= 12 ? 'warning' : 'danger'
    };
  };
  
  const riskLevel = calculateRiskLevel();

  const handleRiskStatementChange = (e) => {
    setSelectedRiskStatement(e.target.value);
    // Log selected risk statement for debugging
    const selected = riskStatements.find(risk => risk.id === e.target.value);
    console.log("Selected risk statement:", selected);
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

    try {
      setProcessing(true);
      const token = localStorage.getItem('access_token');
      
      const approvalData = {
        action: "APPROVE",
        pernyataan_risiko_id: selectedRiskStatement,
        dampak_id: selectedImpactScore,
        kemungkinan_id: "1", // Fixed likelihood score of 1
        notes: notes
      };
      
      const response = await axios.post(
        API_ENDPOINTS.approveLaporanKejadian(laporanId),
        approvalData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data) {
        showToast('success', 'Laporan berhasil disetujui dan terhubung dengan pernyataan risiko');
        onSuccess();
        onHide();
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      showToast('error', 'Gagal menyetujui laporan');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      {console.log("Rendering with riskStatements:", riskStatements)}
      <style>
        {`
          .dark-select {
            color: #212529 !important;
          }
          .dark-select option {
            color: #212529 !important;
            background-color: white !important;
          }
        `}
      </style>
      <Modal.Header closeButton>
        <Modal.Title>Terima Laporan Kejadian {tahunId && `- Tahun ${tahunId}`}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ContentLoaderWrapper loading={loading} error="">
          <p className="text-muted mb-3">
            Untuk menerima laporan, Anda perlu menghubungkannya dengan pernyataan risiko yang sudah ada dan memberikan nilai dampaknya.
          </p>
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label><strong>Pilih Pernyataan Risiko</strong></Form.Label>
              <Form.Select 
                value={selectedRiskStatement}
                onChange={handleRiskStatementChange}
                required
                className="dark-select"
                style={{ color: '#212529 !important' }}
              >
                <option value="" style={{ color: '#212529' }}>-- Pilih Pernyataan Risiko --</option>
                {riskStatements.map(risk => (
                  <option key={risk.id} value={risk.id} style={{ color: '#212529' }}>
                    {risk.pernyataan_risiko || risk.nama}
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
                className="dark-select"
                style={{ color: '#212529 !important' }}
              >
                <option value="" style={{ color: '#212529' }}>-- Pilih Skor Dampak --</option>
                {impactScores.map(score => (
                  <option key={score.id} value={score.id} style={{ color: '#212529' }}>
                    {score.nilai} - {score.nama}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Pilih nilai dampak dari kejadian ini terhadap pernyataan risiko
              </Form.Text>
            </Form.Group>
            
            {selectedImpactScore && (
              <div className="d-flex align-items-center mb-3">
                <span className="me-2"><strong>Level Risiko:</strong></span>
                <Badge 
                  bg={riskLevel?.color}
                  className="fs-6 py-2 px-3"
                >
                  {riskLevel?.value}
                </Badge>
              </div>
            )}
          </Form>
        </ContentLoaderWrapper>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={processing}>
          Batal
        </Button>
        <Button 
          variant="success" 
          onClick={handleApprove} 
          disabled={processing || !selectedRiskStatement || !selectedImpactScore}
        >
          {processing ? (
            <>
              <Spinner animation="border" size="sm" /> 
              <span className="ms-2">Memproses...</span>
            </>
          ) : (
            'Terima Laporan'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ApproveModal; 