import { useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Modal, Button, Alert } from 'react-bootstrap';
import { FiSave, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import { useTahun } from '../../context/TahunContext';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import CardHeader from '../shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';

const ProsesAkhirTahunContent = ({ title = "Proses Akhir Tahun" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const { tahunId } = useTahun();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleProsesAkhirTahun = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };

            const res = await axios.get(API_ENDPOINTS.getIdentifikasiRisikoSummary(idInstansi, tahunId), { headers });
            const items = res.data;

            for (const item of items) {
                if (!item.memenuhi_actual) {
                    const analisisRes = await axios.get(API_ENDPOINTS.getAnalisisRisikoByIdentifikasiRisikoId(item.id_identifikasi), { headers });
                    const analisisData = analisisRes.data[0];

                    if (analisisData && analisisData.id) {
                        const payload = {
                            skor_kemungkinan_actual: analisisData.skor_kemungkinan_actual,
                            skor_dampak_actual: analisisData.skor_dampak_actual,
                            kemungkinan_id_actual: analisisData.kemungkinan_id_actual,
                            dampak_id_actual: analisisData.dampak_id_actual
                        };

                        await axios.post(API_ENDPOINTS.postAnalisisRisikoPatById(analisisData.id), payload, { headers });
                    }
                }
            }

            await axios.post(API_ENDPOINTS.postAnalisisRisikoPat(tahunId, idInstansi, idIndukUnitKerja), {}, { headers });

            showToast("success", "Proses akhir tahun berhasil!");
        } catch (error) {
            const msg = error?.response?.data?.detail || "Gagal memproses akhir tahun.";
            showToast("error", msg);
        } finally {
            setShowConfirmModal(false);
            setLoading(false);
        }
    };

    if (isRemoved) return null;

    return (
        <ContentLoaderWrapper loading={loading} error={errorMessage} message="Sedang memproses akhir tahun...">
            <div className="card stretch stretch-full">
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body">
                    <Alert variant="info" className="d-flex align-items-start gap-3">
                        <FiInfo size={20} className="mt-1 text-primary" />
                        <div>
                            <h5 className="mb-1 ">Informasi </h5>
                            <ul className="mb-2 ps-3">
                                <li>Seluruh <strong>analisis risiko yang telah memiliki nilai aktual</strong> akan dipindahkan ke tahun berikutnya.</li>
                                <li>Nilai <strong>actual</strong> akan digunakan sebagai nilai <em>residual</em> di tahun depan.</li>
                                <li>Semua RTP yang telah selesai akan disalin menjadi <strong>aktivitas pengendalian</strong> untuk tahun berikutnya.</li>
                            </ul>
                        </div>
                    </Alert>
                    <Alert variant="warning" className="d-flex align-items-start gap-2 py-3 px-3">
                        <FiAlertTriangle size={20} className="mt-1 text-warning" />
                        <div>
                            <h5 className="mb-1 text-warning">Perhatian </h5>
                            Pastikan <strong>seluruh analisis risiko sudah memiliki skor kemungkinan dan dampak aktual</strong>.<br />
                            Jika tidak, proses akan gagal dan Anda akan diminta melengkapinya terlebih dahulu.
                        </div>
                    </Alert>
                    <div className="d-flex justify-content-end mt-3 mb-4">
                        <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => setShowConfirmModal(true)}
                            disabled={loading}
                        >
                            <FiSave size={16} className="me-2" />
                            Proses Sekarang
                        </button>
                    </div>
                </div>
            </div>

            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fs-6">Konfirmasi Proses Akhir Tahun</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="text-center">
                        <FiAlertTriangle size={32} className="text-warning mb-2" />
                        <p className="mb-2">
                            Apakah Anda yakin ingin melakukan proses akhir tahun?
                        </p>
                        <small className="text-muted">
                            Data risiko akan menjadi enable dan otomatis dialihkan ke tahun berikutnya.
                        </small>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light-secondary" onClick={() => setShowConfirmModal(false)}>
                        Batal
                    </Button>
                    <Button variant="primary" onClick={handleProsesAkhirTahun} disabled={loading}>
                        {loading ? "Memproses..." : "Ya, Lanjutkan"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </ContentLoaderWrapper>
    );
};

ProsesAkhirTahunContent.propTypes = {
    title: PropTypes.string
};

export default ProsesAkhirTahunContent;
