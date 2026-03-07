import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import { useInstansi } from '@/context/InstansiContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import { useTahun } from '@/context/TahunContext';
import { showToast } from '@/utils/toast';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import { useAuth } from '@/context/AuthContext';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const MonitoringRisikoEditContent = ({ resetKey }) => {
  const { monitoringId } = useParams();
  const { idInstansi } = useInstansi();
  const { idIndukUnitKerja } = useIndukUnitKerja();
  const { tahunId } = useTahun();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    nama: '',
    nama_kejadian: '',
    nama_penyebab: '',
    tempat_kejadian: '',
    waktu_kejadian: new Date(),
    skor_dampak: '',
    dampak_id: '',
    pemicu_kejadian: ''
  });
  
  // Options for dropdowns
  const [pernyataanOptions, setPernyataanOptions] = useState([]);
  const [dampakOptions, setDampakOptions] = useState([]);

  // Load monitoring data and options
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch monitoring data
        const monitoringResponse = await axios.get(
          API_ENDPOINTS.getMonitoringRisikoById(monitoringId), 
          { headers }
        );
        
        // Fetch pernyataan risiko options
        const pernyataanResponse = await axios.get(
          API_ENDPOINTS.getMonitoringRisikoPernyataanOptions(idInstansi, tahunId, idIndukUnitKerja),
          { headers }
        );
        
        // Fetch kriteria dampak options
        const dampakResponse = await axios.get(
          API_ENDPOINTS.getMonitoringRisikoKriteriaOptions(idInstansi, idIndukUnitKerja),
          { headers }
        );
        
        // Format options for react-select
        setPernyataanOptions(
          pernyataanResponse.data.map(item => ({
            value: item.id,
            label: item.text
          }))
        );
        
        setDampakOptions(
          dampakResponse.data.map(item => ({
            value: item.id,
            label: `${item.text} (${item.value})`,
            nilai: Number(item.value)
          }))
        );
        
        // Set form data
        const monitoring = monitoringResponse.data;
        setFormData({
          nama: monitoring.nama || '',
          nama_kejadian: monitoring.nama_kejadian || '',
          nama_penyebab: monitoring.nama_penyebab || '',
          tempat_kejadian: monitoring.tempat_kejadian || '',
          waktu_kejadian: monitoring.waktu_kejadian ? new Date(monitoring.waktu_kejadian) : new Date(),
          skor_dampak: monitoring.skor_dampak ? Number(monitoring.skor_dampak) : '',
          dampak_id: monitoring.dampak_id || '',
          pemicu_kejadian: monitoring.pemicu_kejadian || ''
        });
        
      } catch (err) {
        console.error('Error fetching data:', err);
        const errorMessage = err.response?.data?.detail || 'Gagal memuat data';
        setError(errorMessage);
        showToast('error', errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    if (monitoringId && idInstansi && tahunId) {
      fetchData();
    }
  }, [monitoringId, idInstansi, idIndukUnitKerja, tahunId, resetKey]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name, selectedOption) => {
    if (name === 'nama') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: selectedOption ? selectedOption.label : ''
      }));
    } else if (name === 'dampak_id') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: selectedOption ? selectedOption.value : '',
        skor_dampak: selectedOption ? selectedOption.nilai : ''
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const token = localStorage.getItem('access_token');
      const editData = {
        nama: formData.nama,
        nama_kejadian: formData.nama_kejadian,
        nama_penyebab: formData.nama_penyebab,
        tempat_kejadian: formData.tempat_kejadian,
        waktu_kejadian: formData.waktu_kejadian,
        skor_dampak: formData.skor_dampak,
        dampak_id: formData.dampak_id,
        pemicu_kejadian: formData.pemicu_kejadian
      };
      
      await axios.post(
        API_ENDPOINTS.editMonitoringRisiko(monitoringId), 
        editData, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showToast('success', 'Data monitoring risiko berhasil diperbarui');
      navigate('/pengelolaan-risiko/monitoring-risiko');
      
    } catch (err) {
      console.error('Error updating monitoring:', err);
      const errorMessage = err.response?.data?.detail || 'Gagal memperbarui data monitoring risiko';
      showToast('error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Reset form
  const handleReset = () => {
    if (resetKey) {
      resetKey(prev => prev + 1);
    }
  };
  
  return (
    <div className="col-12">
      <ContentLoaderWrapper loading={loading} error={error}>
        <Card>
          <Card.Header>
            <h5 className="mb-0">Edit Data Monitoring Risiko</h5>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Pernyataan Risiko <span className="text-danger">*</span></Form.Label>
                    <Select
                      options={pernyataanOptions}
                      value={pernyataanOptions.find(option => option.label === formData.nama)}
                      onChange={(selected) => handleSelectChange('nama', selected)}
                      placeholder="Pilih Pernyataan Risiko"
                      isClearable
                      isSearchable
                      className="react-select"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nama Kejadian <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="nama_kejadian"
                      value={formData.nama_kejadian}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nama Penyebab</Form.Label>
                    <Form.Control
                      type="text"
                      name="nama_penyebab"
                      value={formData.nama_penyebab}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Tempat Kejadian <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="tempat_kejadian"
                      value={formData.tempat_kejadian}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Waktu Kejadian <span className="text-danger">*</span></Form.Label>
                    <DatePicker
                      selected={formData.waktu_kejadian}
                      onChange={(date) => setFormData(prev => ({ ...prev, waktu_kejadian: date }))}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      timeCaption="Waktu"
                      dateFormat="dd/MM/yyyy HH:mm"
                      className="form-control"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Skor Dampak <span className="text-danger">*</span></Form.Label>
                    <Select
                      options={dampakOptions}
                      value={
                        dampakOptions.find(option => option.value === formData.dampak_id) || 
                        dampakOptions.find(option => Number(option.nilai) === Number(formData.skor_dampak))
                      }
                      onChange={(selected) => handleSelectChange('dampak_id', selected)}
                      placeholder="Pilih Kriteria Dampak"
                      isClearable
                      isSearchable
                      className="react-select"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Pemicu Kejadian <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="pemicu_kejadian"
                      value={formData.pemicu_kejadian}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <div className="d-flex justify-content-end gap-2">
                <Button 
                  variant="light" 
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => navigate('/pengelolaan-risiko/monitoring-risiko')}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" className="me-2" />
                      Menyimpan...
                    </>
                  ) : 'Simpan Perubahan'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </ContentLoaderWrapper>
    </div>
  );
};

export default MonitoringRisikoEditContent; 