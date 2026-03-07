import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Row, Col, Spinner, InputGroup } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiMapPin } from 'react-icons/fi';
import API_ENDPOINTS from '@/config/apiConfig';
import logo from '/images/logo-full-ex-grimis.png'; 

const LaporanKejadianForm = () => {
  const { referenceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verified, setVerified] = useState(false);
  const [instansi, setInstansi] = useState({});
  const [indukUnitKerja, setIndukUnitKerja] = useState({});
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Format current datetime for the datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [formData, setFormData] = useState({
    email: '',
    noTelp: '',
    namaLengkap: '',
    kejadian: '',
    waktuKejadian: getCurrentDateTime(),
    tempat: '',
    penjelasan: ''
  });

  useEffect(() => {
    const verifyReferenceId = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_ENDPOINTS.verifyAnonymousLink(referenceId));
        
        if (response.data && response.data.valid) {
          setVerified(true);
          setInstansi(response.data.instansi || {});
          setIndukUnitKerja(response.data.induk_unit_kerja || {});
        } else {
          setError('Link tidak valid atau sudah kedaluwarsa');
        }
      } catch (err) {
        console.error('Error verifying reference ID:', err);
        setError('Link tidak valid atau sudah kedaluwarsa');
      } finally {
        setLoading(false);
      }
    };

    verifyReferenceId();
  }, [referenceId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung oleh browser Anda');
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Try to get address from coordinates using a reverse geocoding service
          const { latitude, longitude } = position.coords;
          
          // You can replace this with your preferred geocoding service
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          
          const data = await response.json();
          
          if (data && data.display_name) {
            setFormData(prev => ({ ...prev, tempat: data.display_name }));
          } else {
            // Fallback to coordinates if address lookup fails
            setFormData(prev => ({ 
              ...prev, 
              tempat: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            }));
          }
        } catch (error) {
          console.error('Error getting location:', error);
          alert('Gagal mendapatkan lokasi. Silakan masukkan secara manual.');
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Gagal mendapatkan lokasi. Silakan masukkan secara manual.');
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      const response = await axios.post(
        API_ENDPOINTS.submitLaporanKejadian(referenceId), 
        {
          email: formData.email,
          no_telp: formData.noTelp,
          nama_lengkap: formData.namaLengkap,
          kejadian: formData.kejadian,
          waktu_kejadian: formData.waktuKejadian,
          tempat: formData.tempat,
          penjelasan: formData.penjelasan
        }
      );
      
      if (response.data) {
        setSuccess(true);
        // Reset form
        setFormData({
          email: '',
          noTelp: '',
          namaLengkap: '',
          kejadian: '',
          waktuKejadian: getCurrentDateTime(),
          tempat: '',
          penjelasan: ''
        });
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Gagal mengirim laporan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" />
        <span className="ms-2">Memverifikasi link...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Card className="shadow">
          <Card.Body className="text-center p-5">
            <div className="mb-4">
              <img src={logo} alt="RMIS Logo" height="60" />
            </div>
            <h3 className="text-danger mb-3">Error</h3>
            <p>{error}</p>
            <Button variant="primary" onClick={() => navigate('/')}>
              Kembali ke Beranda
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (success) {
    return (
      <Container className="mt-5">
        <Card className="shadow">
          <Card.Body className="text-center p-5">
            <div className="mb-4">
              <img src={logo} alt="RMIS Logo" height="60" />
            </div>
            <h3 className="text-success mb-3">Laporan Berhasil Dikirim</h3>
            <p>Terima kasih atas laporan Anda. Tim kami akan segera menindaklanjuti.</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light py-4">
      <Card className="shadow-lg border-0" style={{ width: '650px' }}>
        <Card.Body className="px-4 py-3">
          <div className="text-center mb-3">
            <img src={logo} alt="RMIS Logo" height="40" />
            <h4 className="mt-2 mb-0">LAPOR KEJADIAN</h4>
            <p className="text-muted small mb-3">{indukUnitKerja.nama || instansi.nama}</p>
          </div>

          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Nama Lengkap*</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="namaLengkap" 
                    value={formData.namaLengkap}
                    onChange={handleChange}
                    required
                    placeholder="Masukkan nama lengkap"
                    size="sm"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Email</Form.Label>
                  <Form.Control 
                    type="email" 
                    name="email" 
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Masukkan email"
                    size="sm"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">No Telepon</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="noTelp" 
                    value={formData.noTelp}
                    onChange={handleChange}
                    placeholder="+62"
                    size="sm"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Waktu Kejadian*</Form.Label>
                  <Form.Control 
                    type="datetime-local" 
                    name="waktuKejadian" 
                    value={formData.waktuKejadian}
                    onChange={handleChange}
                    required
                    size="sm"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Kejadian*</Form.Label>
              <Form.Control 
                type="text" 
                name="kejadian" 
                value={formData.kejadian}
                onChange={handleChange}
                required
                placeholder="Isi kejadian"
                size="sm"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Tempat*</Form.Label>
              <InputGroup size="sm">
                <Form.Control 
                  type="text" 
                  name="tempat" 
                  value={formData.tempat}
                  onChange={handleChange}
                  required
                  placeholder="Lokasi kejadian"
                  size="sm"
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

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Penjelasan*</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3}
                name="penjelasan" 
                value={formData.penjelasan}
                onChange={handleChange}
                required
                placeholder="Jelaskan kronologi kejadian secara detail"
                size="sm"
              />
            </Form.Group>

            <div className="d-grid mt-4">
              <Button 
                variant="primary" 
                type="submit"
                disabled={submitting}
                className="py-2"
              >
                {submitting ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Mengirim Data
                  </>
                ) : (
                  'KIRIM DATA'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default LaporanKejadianForm; 