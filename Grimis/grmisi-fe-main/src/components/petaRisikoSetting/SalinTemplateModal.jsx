import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import axios from 'axios';
import { FiCheckCircle } from 'react-icons/fi';
import TablePernyataanRisiko from '@/components/shared/table/TablePernyataanRisiko';
import { showToast } from '@/utils/toast';
import API_ENDPOINTS from '../../config/apiConfig';
import { useTahun } from '../../context/TahunContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';

const SalinTemplateModal = ({ show, onClose }) => {
    const { tahunId } = useTahun();
    const { idTemplate } = useIndukUnitKerja();
    const [templateList, setTemplateList] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem('access_token');

    useEffect(() => {
        if (show) {
            fetchTemplates();
        }
    }, [show]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_ENDPOINTS.getPetaTemplate(tahunId), {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Filter agar tidak tampilkan template aktif
            const filtered = (res.data || []).filter(tpl => tpl.id !== idTemplate);
            setTemplateList(filtered);
        } catch (err) {
            console.error(err);
            showToast("error", "Gagal mengambil daftar template.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (selectedTemplate) => {
        try {
            await axios.put(
                API_ENDPOINTS.putPetaTemplateById(idTemplate),
                {
                    frekuensi: selectedTemplate.frekuensi,
                    dampak: selectedTemplate.dampak
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            showToast("success", "Template berhasil disalin.");
            setSelectedId(selectedTemplate.id);
            onClose(); // Tutup modal
            window.location.reload(); // Refresh data
        } catch (err) {
            console.error(err);
            showToast("error", "Gagal menyalin template.");
        }
    };

    const tableData = templateList.map((tpl) => ({
        ...tpl,
        nama_template: (
            <>
                <div className="fw-semibold">{tpl.nama}</div>
                <div className="text-muted small">Frekuensi: {tpl.frekuensi} | Dampak: {tpl.dampak}</div>
            </>
        ),
        tindakan: (
            <button
                className={`btn btn-sm ${selectedId === tpl.id ? 'btn-primary' : 'btn-light-primary'}`}
                onClick={() => handleSelect(tpl)}
            >
                {selectedId === tpl.id ? (
                    <>
                        <FiCheckCircle className="me-1" /> Disalin
                    </>
                ) : (
                    'Pilih Template'
                )}
            </button>
        )
    }));

    const columns = [
        {
            accessorKey: 'nama_template',
            header: () => 'Template',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'tahun',
            header: () => 'Tahun',
        },
        {
            accessorKey: 'selera_risiko.current',
            header: () => 'Selera',
            cell: (info) => {
                const current = info.row.original.selera_risiko?.current || 0;
                const max = info.row.original.selera_risiko?.max || 0;
                return `${current} / ${max}`;
            }
        },
        {
            accessorKey: 'tindakan',
            header: 'Tindakan',
            cell: (info) => info.getValue()
        }
    ];

    return (
        <Modal show={show} onHide={onClose} size="lg" centered scrollable>
            <Modal.Header closeButton>
                <Modal.Title className="fs-6">Salin Template dari Tahun {tahunId}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <TablePernyataanRisiko
                    title="Daftar Template"
                    data={tableData}
                    columns={columns}
                    isLoading={loading}
                />
            </Modal.Body>
        </Modal>
    );
};

SalinTemplateModal.propTypes = {
    show: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default SalinTemplateModal;
