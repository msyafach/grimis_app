import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import { showToast } from '@/utils/toast';

const ApproveKamusModal = ({ show, onHide, proposalId, onSuccess }) => {
  const [selectedStatus, setSelectedStatus] = useState('TERVERIFIKASI');
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!proposalId) {
      showToast('error', 'ID usulan tidak valid');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      await axios.post(
        `${API_ENDPOINTS.postKamusRisiko}/${proposalId}/approve?status_approval=${selectedStatus}&catatan=${encodeURIComponent(catatan)}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const statusMessages = {
        'TERVERIFIKASI': 'Usulan kamus risiko berhasil disetujui',
        'GAGAL_VERIFIKASI': 'Usulan kamus risiko berhasil ditolak',
        'DISETUJUI_DENGAN_PENYESUAIAN': 'Usulan kamus risiko berhasil disetujui dengan penyesuaian'
      };

      showToast('success', statusMessages[selectedStatus] || 'Status usulan berhasil diubah');
      onHide();
      onSuccess();
    } catch (error) {
      console.error('Error approving proposal:', error);
      const errorMessage = error.response?.data?.detail || 'Gagal memproses usulan kamus risiko';
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Verifikasi Usulan Kamus Risiko</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Status Approval</Form.Label>
            <Form.Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              disabled={loading}
            >
              <option value="TERVERIFIKASI">Terverifikasi</option>
              <option value="GAGAL_VERIFIKASI">Gagal Verifikasi</option>
              <option value="DISETUJUI_DENGAN_PENYESUAIAN">Disetujui dengan Penyesuaian</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Catatan</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Masukkan catatan untuk pengujuan (opsional)"
              disabled={loading}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Batal
        </Button>
        <Button
          variant={selectedStatus === 'GAGAL_VERIFIKASI' ? 'danger' : 'primary'}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Memproses...' : 'Simpan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ApproveKamusModal;
