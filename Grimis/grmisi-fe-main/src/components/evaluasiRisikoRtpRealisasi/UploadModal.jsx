import { Modal, Button, Form } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { useState } from 'react';
import axios from 'axios';
import { showToast } from '@/utils/toast';
import API_ENDPOINTS from '../../config/apiConfig';
import { FiFilePlus } from 'react-icons/fi';

const UploadFileModal = ({ show, onHide, rtpId, onUploadSuccess }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            showToast("error", "Silakan pilih file.");
            return;
        }

        try {
            setUploading(true);
            const token = localStorage.getItem('access_token');
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('unsur_spip_id', '');

            await axios.post(API_ENDPOINTS.postRtpAttachment(rtpId), formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            showToast('success', 'File berhasil diunggah!');
            onHide();
            setSelectedFile(null);
            if (onUploadSuccess) onUploadSuccess();
        } catch (err) {
            console.error(err);
            showToast('error', 'Gagal mengunggah file');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Unggah Berkas</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleUpload}>
                    <Form.Group className="mb-3">
                        <Form.Label>Pilih Berkas</Form.Label>
                        <Form.Control type="file" onChange={handleFileChange} />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" type="submit" disabled={uploading} onClick={handleUpload}>
                    {uploading ? 'Mengunggah...' : 'Unggah'}
                </Button>
            </Modal.Footer>
        </Modal>

    );
};

UploadFileModal.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    rtpId: PropTypes.string.isRequired,
    onUploadSuccess: PropTypes.func,
};

export default UploadFileModal;
