import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiEdit3, FiEye, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import Swal from 'sweetalert2';
import TablePernyataanRisiko from '@/components/shared/table/TablePernyataanRisiko';
import { Badge } from 'react-bootstrap';
import { useInstansi } from '@/context/InstansiContext';
import API_ENDPOINTS from '@/config/apiConfig';

const actions = [
    { label: "Lihat Detail", icon: <FiEye /> },
    { label: "Edit", icon: <FiEdit3 /> },
    { label: "Hapus", icon: <FiTrash2 /> },
];

const PernyataanRisikoTabel = ({ generatedStatements }) => {
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [data, setData] = useState([]);
    const [kamusRisiko, setKamusRisiko] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [singleSelectRow, setSingleSelectRow] = useState(null);
    const { idInstansi } = useInstansi();

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                if (!idInstansi) return;
                const token = localStorage.getItem('access_token');

                const kamusRisikoResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/kamus-risiko?id_instansi=${idInstansi}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setKamusRisiko(kamusRisikoResponse.data)

                if (kamusRisiko && generatedStatements) {
                    const aiData = generatedStatements.map(item => {
                        const isTagFraud = item.tag === 'FRAUD';

                        return {
                            id: item.id,
                            nama: (
                                <>
                                    <div>{item.pernyataan || item.pernyataan_risiko}</div>
                                    <div className="fw-light text-muted">
                                        {item.deskripsi}
                                    </div>
                                </>
                            ),
                            deskripsi: item.deskripsi,
                            tag: item.tag || "NORMAL",
                            tagDisplay: (
                                isTagFraud ? (
                                    <Badge bg="danger" className="me-1">FRAUD</Badge>
                                ) : (
                                    <Badge bg="info" className="me-1">AI Generated</Badge>
                                )
                            )
                        };
                    });

                    // Add a tag field for manual kamusRisiko data
                    const manualData = kamusRisiko.map(item => ({
                        ...item,
                        tag: "Input Manual",
                        tagDisplay: <Badge bg="secondary" className="me-1">Input Manual</Badge>
                    }));

                    // Combine both arrays and sort AI data to be on top
                    const combinedData = [...aiData, ...manualData];
                    setData(combinedData);
                }

            } catch (error) {
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [generatedStatements, kamusRisiko, idInstansi]);

    const handleSelect = (rowId) => {
        if (singleSelectRow === rowId) {
            setSingleSelectRow(null);
        } else {
            setSingleSelectRow(rowId);
        }
    };

    const handleMultipleSelect = (rowId) => {
        setSelectedRows(prev => {
            if (prev.includes(rowId)) {
                return prev.filter(id => id !== rowId);
            }
            return [...prev, rowId];
        });
    };

    const columns = [
        {
            accessorKey: 'id',
            header: ({ table }) => {
                const checkboxRef = React.useRef(null);

                useEffect(() => {
                    if (checkboxRef.current) {
                        checkboxRef.current.indeterminate = table.getIsSomeRowsSelected();
                    }
                }, [table.getIsSomeRowsSelected()]);

                return (
                    <input
                        type="checkbox"
                        className="custom-table-checkbox"
                        ref={checkboxRef}
                        checked={table.getIsAllRowsSelected()}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                    />
                );
            },
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    className="custom-table-checkbox"
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    onChange={row.getToggleSelectedHandler()}
                />
            ),
            meta: {
                headerClassName: 'width-30',
            },
        },
        {
            accessorKey: 'nama_kategori',
            header: () => 'Nama Kategori',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'nama',
            header: () => 'Nama Risiko',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'tagDisplay',
            header: () => 'Tag',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'tindakan',
            header: 'Tindakan',
            cell: (info) => (
                <div className="hstack gap-2 justify-content-center">
                    {/* Button for Simpan Data (multiple select) */}
                    <button
                        className={`btn btn-sm ${selectedRows.includes(info.row.original.id) ? 'btn-primary' : 'btn-light-primary'}`}
                        onClick={() => handleMultipleSelect(info.row.original.id)}
                    >
                        {selectedRows.includes(info.row.original.id) ? (
                            <>
                                <FiCheckCircle className="me-1" /> Disimpan
                            </>
                        ) : (
                            'Simpan Data'
                        )}
                    </button>

                    {/* Button for Pilih Data (single select) */}
                    <button
                        className={`btn btn-sm ${singleSelectRow === info.row.original.id ? 'btn-primary' : 'btn-light-primary'}`}
                        onClick={() => handleSelect(info.row.original.id)}
                    >
                        {singleSelectRow === info.row.original.id ? (
                            <>
                                <FiCheckCircle className="me-1" /> Dipilih
                            </>
                        ) : (
                            'Pilih Data'
                        )}
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div>
            {loading ? <div>Loading...</div> : ""}
            {errorMessage && <div className="text-danger">{errorMessage}</div>}
            <TablePernyataanRisiko title={"Pernyataan Risiko"} data={data} columns={columns} />
        </div>
    );
};

export default PernyataanRisikoTabel;
