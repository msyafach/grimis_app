import axios from 'axios';
import { Modal, Button } from "react-bootstrap";
import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "@/utils/toast";
import API_ENDPOINTS from '../../config/apiConfig';
import { getColumns } from "./Columns";
import { FiFilePlus } from 'react-icons/fi';
import TableEvaluasiRisiko from '../shared/table/TableEvaluasiRisiko';

const FileTabelModal = ({ show, onClose, rtpId }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const res = await axios.get(API_ENDPOINTS.getRtpAttachment(rtpId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            setData(res.data);
        } catch (error) {
            console.error(error);
            showToast("error", "Gagal mengambil daftar file.");
        } finally {
            setLoading(false);
        }
    }, [rtpId]);

    useEffect(() => {
        if (show) fetchFiles();
    }, [show, fetchFiles]);

    const handleDelete = async () => {
        if (!selectedRow) return;
        try {
            const token = localStorage.getItem("access_token");
            await axios.delete(API_ENDPOINTS.deleteRtpAttachment(selectedRow.id), {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Berkas berhasil dihapus");
            setData((prev) => prev.filter((item) => item.id !== selectedRow.id));
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error(error);
            showToast("error", "Gagal menghapus berkas");
        }
    };

    const handleDownload = async (row) => {
        try {
            const token = localStorage.getItem("access_token");
            const res = await axios.get(API_ENDPOINTS.getRtpAttachmentDownload(row.id), {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", row.file_name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showToast("success", "Berkas berhasil diunduh");
        } catch (error) {
            console.error(error);
            showToast("error", "Gagal mengunduh berkas");
        }
    };

    const columns = useMemo(() => getColumns((action, row) => {
        if (action === "download") handleDownload(row);
        if (action === "delete") {
            setSelectedRow(row);
            setShowDeleteConfirm(true);
        }
    }), []);

    return (
        <>
            <Modal show={show} onHide={onClose} centered size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>Daftar Berkas</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <TableEvaluasiRisiko title="Berkas RTP" data={data} columns={columns} loading={loading} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose}>Tutup</Button>
                </Modal.Footer>
            </Modal>

            {/* Konfirmasi Hapus */}
            <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Apakah Anda yakin ingin menghapus berkas <strong>{selectedRow?.file_name}</strong>?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light-secondary" onClick={() => setShowDeleteConfirm(false)}>Batal</Button>
                    <Button variant="danger" onClick={handleDelete}>Hapus</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default FileTabelModal;
