import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Spinner, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
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
import { FiMapPin } from 'react-icons/fi';

const MonitoringRisikoTambahContent = ({ resetKey }) => {
  const { idInstansi } = useInstansi();
  const { idIndukUnitKerja } = useIndukUnitKerja();
  const { tahunId } = useTahun();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  
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

  // Calculate triwulan based on selected date
  const calculateTriwulan = (date) => {
    const month = date.getMonth() + 1;
    if (month >= 1 && month <= 3) return 1;
    if (month >= 4 && month <= 6) return 2;
    if (month >= 7 && month <= 9) return 3;
    return 4;
  };

  // Load options for dropdowns
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        setError('');
        
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };
        
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
        
      } catch (err) {
        console.error('Error fetching options:', err);
        const errorMessage = err.response?.data?.detail || 'Gagal memuat data opsi';
        setError(errorMessage);
        showToast('error', errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    if (idInstansi && tahunId) {
      fetchOptions();
    }
  }, [idInstansi, idIndukUnitKerja, tahunId, resetKey]);
  
  // Reset form
  const resetForm = () => {
    setFormData({
      nama: '',
      nama_kejadian: '',
      nama_penyebab: '',
      tempat_kejadian: '',
      waktu_kejadian: new Date(),
      skor_dampak: '',
      dampak_id: '',
      pemicu_kejadian: ''
    });
  };
  
  // Handle reset
  const handleReset = () => {
    resetForm();
    if (resetKey) {
      resetKey(prev => prev + 1);
    }
  };
  
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
  
  // Get current location
  const getLocation = () => {
    if (!navigator.geolocation) {
      showToast('error', 'Geolocation tidak didukung oleh browser Anda');
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Try to get address from coordinates using a reverse geocoding service
          const { latitude, longitude } = position.coords;
          
          // Use OpenStreetMap's Nominatim service for reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          
          const data = await response.json();
          
          if (data && data.display_name) {
            setFormData(prev => ({ ...prev, tempat_kejadian: data.display_name }));
          } else {
            // Fallback to coordinates if address lookup fails
            setFormData(prev => ({ 
              ...prev, 
              tempat_kejadian: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            }));
          }
        } catch (error) {
          console.error('Error getting location:', error);
          showToast('error', 'Gagal mendapatkan lokasi. Silakan masukkan secara manual.');
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        showToast('error', 'Gagal mendapatkan lokasi. Silakan masukkan secara manual.');
        setGettingLocation(false);
      }
    );
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const token = localStorage.getItem('access_token');
      const createData = {
        nama: formData.nama,
        nama_kejadian: formData.nama_kejadian,
        nama_penyebab: formData.nama_penyebab || '',
        tempat_kejadian: formData.tempat_kejadian,
        waktu_kejadian: formData.waktu_kejadian,
        skor_dampak: formData.skor_dampak,
        dampak_id: formData.dampak_id,
        pemicu_kejadian: formData.pemicu_kejadian,
        tahun: Number(tahunId),
        triwulan_periode_kejadian: calculateTriwulan(formData.waktu_kejadian),
        id_instansi: idInstansi,
        id_induk_unit_kerja: idIndukUnitKerja || null,
        email: user.email,
        no_hp: user.phone || '-'
      };
      
      await axios.post(
        API_ENDPOINTS.postMonitoringRisiko(), 
        createData, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showToast('success', 'Data monitoring risiko berhasil ditambahkan');
      navigate('/pengelolaan-risiko/monitoring-risiko');
      
    } catch (err) {
      console.error('Error creating monitoring:', err);
      const errorMessage = err.response?.data?.detail || 'Gagal menambahkan data monitoring risiko';
      showToast('error', errorMessage);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="col-12">
      <ContentLoaderWrapper loading={loading} error={error}>
        <Card>
          <Card.Header>
            <h5 className="mb-0">Tambah Data Monitoring Risiko</h5>
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
                      required
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
                    <InputGroup>
                      <Form.Control
                        type="text"
                        name="tempat_kejadian"
                        value={formData.tempat_kejadian}
                        onChange={handleChange}
                        required
                        placeholder="Masukkan lokasi kejadian"
                      />
                      <Button 
                        variant="outline-secondary" 
                        onClick={getLocation}
                        disabled={gettingLocation}
                        title="Gunakan lokasi saat ini"
                      >
                        {gettingLocation ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <FiMapPin />
                        )}
                      </Button>
                    </InputGroup>
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
                  ) : 'Simpan'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </ContentLoaderWrapper>
    </div>
  );
};

export default MonitoringRisikoTambahContent; 