import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiEdit3, FiEye, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import Swal from 'sweetalert2';
import TableEvaluasiRisiko from '@/components/shared/table/TableEvaluasiRisiko';
import TablePernyataanRisiko from '@/components/shared/table/TablePernyataanRisiko';


const actions = [
    { label: "Lihat Detail", icon: <FiEye /> },
    { label: "Edit", icon: <FiEdit3 /> },
    { label: "Hapus", icon: <FiTrash2 /> },
];

const EvaluasiRisikoTabel = ({ generatedRootCauses, selectedRootCauses, setSelectedRootCauses, savedRootCauseIds = [] }) => {
    // const rootCauses = generatedRootCauses?.root_causes || [];
    // const rootCauses = Array.isArray(generatedRootCauses?.root_causes)
    //     ? generatedRootCauses.root_causes
    //     : [];

    const rootCauses = Array.isArray(generatedRootCauses.root_causes)
        ? generatedRootCauses.root_causes
        : [];

    if (!Array.isArray(rootCauses)) {
        return <p className="text-muted">Data root cause tidak tersedia.</p>;
    }



    const [selectedIds, setSelectedIds] = useState([]);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [data, setData] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [singleSelectRow, setSingleSelectRow] = useState(selectedRootCauses?.id || null);

    useEffect(() => {
        if (Array.isArray(selectedRootCauses)) {
            setSelectedIds(selectedRootCauses.map((c) => c.id));
        }
    }, [selectedRootCauses]);


    const handleSelect = (rowId) => {
        if (singleSelectRow === rowId) {
            setSingleSelectRow(null);
            setSelectedRootCauses(null);
        } else {
            setSingleSelectRow(rowId);
            const selectedData = rootCauses.find((row) => row.id === rowId);
            setSelectedRootCauses(selectedData);
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

    const handleToggleSelect = (rowId) => {
        let updated = [];

        if (selectedRows.includes(rowId)) {
            updated = selectedRows.filter((id) => id !== rowId);
        } else {
            updated = [...selectedRows, rowId];
        }

        setSelectedRows(updated);

        const selectedData = rootCauses.filter((row) => updated.includes(row.id));
        setSelectedRootCauses(selectedData);
    };

    const handleToggle = (id) => {
        if (savedRootCauseIds.includes(id)) return;

        const isSelected = selectedIds.includes(id);
        let updatedIds = isSelected
            ? selectedIds.filter((val) => val !== id)
            : [...selectedIds, id];

        const selectedData = rootCauses.filter((item) =>
            updatedIds.includes(item.id)
        );

        setSelectedIds(updatedIds);
        setSelectedRootCauses(selectedData);
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
            accessorKey: 'jenis',
            header: () => 'Jenis',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'deskripsi',
            header: () => 'Deskripsi',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'pengendalian',
            header: () => 'Pengendalian',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'jenis_pengendalian',
            header: () => 'Jenis Pengendalian',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'tindakan',
            header: 'Tindakan',
            cell: (info) => {
                const id = info.row.original.id;
                const isSaved = savedRootCauseIds.includes(id);
                const isSelected = selectedIds.includes(id);
                return (
                    <div className="d-flex justify-content-center">
                        <button
                            className={`btn btn-sm ${isSaved ? 'btn-success' : isSelected ? 'btn-primary' : 'btn-light-primary'
                                }`}
                            disabled={isSaved}
                            onClick={() => handleToggle(id)}
                        >
                            {isSaved ? (
                                <>
                                    <FiCheckCircle className="me-1" /> Tersimpan
                                </>
                            ) : isSelected ? (
                                <>
                                    <FiCheckCircle className="me-1" /> Dipilih
                                </>
                            ) : (
                                'Pilih Data'
                            )}
                        </button>
                    </div>
                );
            },
            //     (
            //     <div className="hstack gap-2 justify-content-center">
            //         {/* Button for Simpan Data (multiple select) */}
            //         <button
            //             className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-light-primary'}`}
            //             onClick={() => handleToggleSelect(info.row.original.id)}
            //         >
            //             {isSelected ? (
            //                 <>
            //                     <FiCheckCircle className="me-1" /> Dipilih
            //                 </>
            //             ) : (
            //                 'Pilih Data'
            //             )}
            //         </button>

            //         {/* Button for Pilih Data (single select) */}
            //         <button
            //             className={`btn btn-sm ${singleSelectRow === info.row.original.id ? 'btn-primary' : 'btn-light-primary'}`}
            //             onClick={() => handleSelect(info.row.original.id)}
            //         >
            //             {singleSelectRow === info.row.original.id ? (
            //                 <>
            //                     <FiCheckCircle className="me-1" /> Dipilih
            //                 </>
            //             ) : (
            //                 'Pilih Data'
            //             )}
            //         </button>
            //     </div>
            // ),
        },
    ];

    return (
        <div>
            {loading ? <div>Loading...</div> : ""}
            {errorMessage && <div className="text-danger">{errorMessage}</div>}
            <TablePernyataanRisiko title={"Evaluasi Risiko Akar Penyebab"} data={rootCauses} columns={columns} />
        </div>
    );
};

export default EvaluasiRisikoTabel;
