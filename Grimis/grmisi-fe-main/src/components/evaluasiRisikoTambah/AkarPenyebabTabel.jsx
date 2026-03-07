import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { FiCheckCircle } from 'react-icons/fi';
import TableEvaluasiRisiko from '@/components/shared/table/TableEvaluasiRisiko';

const AkarPenyebabTabel = forwardRef(({ generatedRootCauses, onSelect, selectedTempIds }, ref) => {
    const [currentSelectedIds, setCurrentSelectedIds] = useState(selectedTempIds || []);

    useEffect(() => {
        setCurrentSelectedIds(selectedTempIds || []);
    }, [selectedTempIds]);

    useImperativeHandle(ref, () => ({
        selectAll: () => {
            const allIds = generatedRootCauses.map(item => item.id);
            setCurrentSelectedIds(allIds);
            generatedRootCauses.forEach(item => {
                if (!currentSelectedIds.includes(item.id)) {
                    onSelect(item);
                }
            });
        },
        clearAll: () => {
            setCurrentSelectedIds([]);
            generatedRootCauses.forEach(item => {
                if (currentSelectedIds.includes(item.id)) {
                    onSelect(item); // unselect semua
                }
            });
        },
        isAllSelected: () => {
            return generatedRootCauses.length > 0 &&
                currentSelectedIds.length === generatedRootCauses.length;
        }
    }));


    const handleSelect = (row) => {
        const id = row.id;
        const isSelected = currentSelectedIds.includes(id);
        const newIds = isSelected
            ? currentSelectedIds.filter(i => i !== id)
            : [...currentSelectedIds, id];

        setCurrentSelectedIds(newIds);
        onSelect(row);
    };

    const data = (generatedRootCauses || []).map(item => ({
        ...item,
        nama: (
            <>
                <div>{item.jenis}</div>
                <div className="fw-light text-muted">{item.deskripsi}</div>
            </>
        ),
    }));

    const columns = [
        {
            accessorKey: 'nama',
            header: () => 'Jenis',
            cell: (info) => (
                <div style={{ whiteSpace: 'normal' }} className="text-wrap text-break">
                    {info.getValue()}
                </div>
            ),
        },
        {
            accessorKey: 'pengendalian',
            header: () => 'Pengendalian',
            cell: (info) => (
                <div style={{ whiteSpace: 'normal' }} className="text-wrap text-break">
                    {info.getValue()}
                </div>
            ),
        },
        {
            accessorKey: 'jenis_pengendalian',
            header: () => 'Jenis Pengendalian',
            cell: (info) => (
                <div style={{ whiteSpace: 'normal' }} className="text-wrap text-break">
                    {info.getValue()}
                </div>
            ),
        },
        {
            accessorKey: 'tindakan',
            header: 'Tindakan',
            cell: (info) => (
                <button
                    className={`btn btn-sm ${currentSelectedIds.includes(info.row.original.id) ? 'btn-primary' : 'btn-light-primary'}`}
                    onClick={() => handleSelect(info.row.original)}
                >
                    {currentSelectedIds.includes(info.row.original.id) ? (
                        <>
                            <FiCheckCircle className="me-1" /> Dipilih
                        </>
                    ) : (
                        'Pilih'
                    )}
                </button>
            ),
        },
    ];

    return (
        <TableEvaluasiRisiko
            title="Hasil Generate Akar Penyebab"
            data={data}
            columns={columns}
        />
    );
});

AkarPenyebabTabel.displayName = 'AkarPenyebabTabel';

AkarPenyebabTabel.propTypes = {
    generatedRootCauses: PropTypes.array.isRequired,
    onSelect: PropTypes.func.isRequired,
    selectedTempIds: PropTypes.array.isRequired,
};

export default AkarPenyebabTabel;
