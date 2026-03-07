import {
    useEffect,
    useState,
    useCallback,
    useMemo,
    forwardRef,
    useImperativeHandle,
} from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import { Modal, Button, Form } from "react-bootstrap";
import Table from "@/components/shared/table/Table";
import { showToast } from "@/utils/toast";
import API_ENDPOINTS from "../../config/apiConfig";
import ContentLoaderWrapper from "../shared/ContentLoaderWrapper";
import { getColumns } from "./Columns";

const AnalisisExistingControlTabel = forwardRef((props, ref) => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { identifikasiId } = useParams();
    const analisisId = state?.analisisId;

    const [analisisExistingControl, setAnalisisExistingControl] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showModalDelete, setShowModalDelete] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [editDescription, setEditDescription] = useState("");
    const [editControlType, setEditControlType] = useState("");
    const [updating, setUpdating] = useState(false);
    const [analisisData, setAnalisisData] = useState(null);
    const [pernyataanRisiko, setPernyataanRisiko] = useState("");

    const fetchAnalisisData = useCallback(async () => {
        // Langsung gunakan identifikasiId jika tersedia (paling reliable)
        const idToUse = identifikasiId || (state?.identifikasiId) || window.location.pathname.split("/").pop();
        
        if (!idToUse) {
            console.error("Tidak ada ID identifikasi risiko yang tersedia");
            return;
        }
        
        try {
            const token = localStorage.getItem("access_token");
            const headers = { Authorization: `Bearer ${token}` };
            
            // Ambil data identifikasi risiko langsung - metode yang paling berhasil
            const identifikasiRes = await axios.get(
                API_ENDPOINTS.getIdentifikasiRisikoById(idToUse),
                { headers }
            );
            
            if (identifikasiRes.data?.pernyataan_risiko) {
                setPernyataanRisiko(identifikasiRes.data.pernyataan_risiko);
            }
            
            // Jika analisisId belum tersedia, coba dapatkan dari identifikasi
            if (!analisisId && !analisisData) {
                try {
                    const analisisList = await axios.get(
                        API_ENDPOINTS.getAnalisisRisikoByIdentifikasiRisikoId(idToUse),
                        { headers }
                    );
                    
                    if (analisisList.data?.length > 0) {
                        setAnalisisData(analisisList.data[0]);
                    }
                } catch (analisisErr) {
                    // Tidak perlu menampilkan error karena kita sudah punya pernyataan risiko
                    console.error("Tidak dapat mengambil data analisis", analisisErr);
                }
            }
        } catch (err) {
            console.error("Gagal mengambil data pernyataan risiko:", err);
        }
    }, [identifikasiId, state, analisisId, analisisData]);

    const fetchData = useCallback(async () => {
        if (!analisisId && !analisisData?.id) {
            setError("Tidak dapat memuat data: ID analisis risiko tidak tersedia");
            setLoading(false);
            return;
        }
        
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const headers = { Authorization: `Bearer ${token}` };
            
            // Gunakan analisisId jika tersedia, jika tidak coba cari dari analisisData
            const idToUse = analisisId || (analisisData ? analisisData.id : null);
            
            if (idToUse) {
                const res = await axios.get(API_ENDPOINTS.getAnalisisRisikoAttachment(idToUse), { headers });
                setAnalisisExistingControl(res.data);
            } else {
                setError("ID analisis risiko tidak tersedia untuk memuat attachment");
            }
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Gagal mengambil data existing control.");
        } finally {
            setLoading(false);
        }
    }, [analisisId, analisisData]);

    useEffect(() => {
        fetchAnalisisData();
    }, [fetchAnalisisData]);
    
    useEffect(() => {
        if (analisisId || (analisisData && analisisData.id)) {
            fetchData();
        }
    }, [fetchData, analisisId, analisisData]);

    useImperativeHandle(ref, () => ({
        reload: fetchData,
    }));

    const handleDelete = async () => {
        if (!selectedRow) return;
        try {
            const token = localStorage.getItem("access_token");
            await axios.delete(API_ENDPOINTS.deleteAnalisisRisikoAttachment(selectedRow.id), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            showToast("success", "Existing Control berhasil dihapus!");
            setAnalisisExistingControl((prev) => prev.filter((item) => item.id !== selectedRow.id));
            setShowModalDelete(false);
        } catch (err) {
            console.error(err);
            showToast("error", "Gagal menghapus Existing Control.");
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        if (!selectedRow) return;
        
        try {
            setUpdating(true);
            const token = localStorage.getItem("access_token");
            
            const formData = new FormData();
            formData.append('type', editControlType);
            formData.append('deskripsi', editDescription);
            
            await axios.put(
                API_ENDPOINTS.updateAnalisisRisikoAttachment(selectedRow.id), 
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            
            showToast("success", "Existing Control berhasil diperbarui!");
            
            // Update the local state to reflect changes
            setAnalisisExistingControl(prev => 
                prev.map(item => 
                    item.id === selectedRow.id 
                        ? { 
                            ...item, 
                            type: editControlType, 
                            deskripsi: editDescription 
                        } 
                        : item
                )
            );
            
            setShowModalEdit(false);
        } catch (err) {
            console.error(err);
            showToast("error", "Gagal memperbarui Existing Control.");
        } finally {
            setUpdating(false);
        }
    };

    const handleDownload = async (row) => {
        try {
            showToast("info", "Memulai unduhan...");
            const token = localStorage.getItem("access_token");

            // Use a direct fetch approach for better handling of binary data
            const response = await fetch(
                API_ENDPOINTS.getAnalisisRisikoAttachmentDownload(row.id),
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    method: 'GET'
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Get the blob from the response
            const blob = await response.blob();

            // Create a URL for the blob
            const url = window.URL.createObjectURL(blob);

            // Create a temporary anchor element and trigger download
            const link = document.createElement("a");
            link.href = url;

            // Get filename from Content-Disposition header if available
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : row.file_name || 'download';

            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();

            // Clean up
            link.remove();
            window.URL.revokeObjectURL(url);

            showToast("success", "Berkas berhasil diunduh");
        } catch (error) {
            console.error("Download error:", error);
            showToast("error", `Gagal mengunduh berkas: ${error.message}`);
        }
    };

    const openEditModal = (row) => {
        setSelectedRow(row);
        setEditDescription(row.deskripsi || "");
        setEditControlType(row.type || "PENGENDALIAN_DOKUMEN");
        setShowModalEdit(true);
    };

    const handleActionClick = useCallback(
        (action, row) => {
            switch (action) {
                case "edit":
                    openEditModal(row);
                    break;
                case "download":
                    handleDownload(row);
                    break;
                case "delete":
                    setSelectedRow(row);
                    setShowModalDelete(true);
                    break;
                default:
                    console.warn("Action tidak dikenali:", action);
            }
        },
        [navigate]
    );

    const columns = useMemo(() => getColumns(handleActionClick), [handleActionClick]);

    const formatControlType = (type) => {
        switch(type) {
            case 'PENGENDALIAN_FISIK':
                return 'Pengendalian Fisik';
            case 'PENGENDALIAN_DOKUMEN':
                return 'Pengendalian Dokumen';
            case 'PENGENDALIAN_APLIKASI':
                return 'Pengendalian Aplikasi';
            default:
                return type;
        }
    };

    // Komponen untuk menampilkan judul tabel dengan pernyataan risiko
    const TableTitle = () => (
        <div>
            <h5 className="mb-1">Data Existing Control</h5>
            {pernyataanRisiko && (
                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                    <strong>Pernyataan Risiko:</strong> {pernyataanRisiko}
                </p>
            )}
        </div>
    );

    return (
        <>
            <ContentLoaderWrapper loading={loading} error={error}>
                <Table title={<TableTitle />} data={analisisExistingControl} columns={columns} />
            </ContentLoaderWrapper>

            {/* Modal Hapus */}
            <Modal show={showModalDelete} onHide={() => setShowModalDelete(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedRow && (
                        <>
                            <p>Yakin ingin menghapus Existing Control ini?</p>
                            <strong>Nama File:</strong> {selectedRow.file_name}
                            <br />
                            <strong>Jenis Pengendalian:</strong> {formatControlType(selectedRow.type)}
                            <br />
                            <strong>Deskripsi:</strong> {selectedRow.deskripsi || '-'}
                            <br />
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light-secondary" onClick={() => setShowModalDelete(false)}>
                        Batal
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Hapus
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Edit */}
            <Modal show={showModalEdit} onHide={() => setShowModalEdit(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Existing Control</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleEdit}>
                    <Modal.Body>
                        {selectedRow && (
                            <>
                                <p><strong>Nama File:</strong> {selectedRow.file_name}</p>
                                
                                <Form.Group className="mb-3">
                                    <Form.Label>Jenis Pengendalian</Form.Label>
                                    <Form.Select 
                                        value={editControlType}
                                        onChange={(e) => setEditControlType(e.target.value)}
                                        required
                                    >
                                        <option value="PENGENDALIAN_FISIK">Pengendalian Fisik</option>
                                        <option value="PENGENDALIAN_DOKUMEN">Pengendalian Dokumen</option>
                                        <option value="PENGENDALIAN_APLIKASI">Pengendalian Aplikasi</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Deskripsi</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        placeholder="Masukkan deskripsi pengendalian"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                    />
                                </Form.Group>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="light-secondary" onClick={() => setShowModalEdit(false)}>
                            Batal
                        </Button>
                        <Button type="submit" variant="primary" disabled={updating}>
                            {updating ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </>
    );
});

AnalisisExistingControlTabel.displayName = "AnalisisExistingControlTabel";

export default AnalisisExistingControlTabel;
