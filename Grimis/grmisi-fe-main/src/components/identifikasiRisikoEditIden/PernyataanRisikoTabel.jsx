import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiCheckCircle } from 'react-icons/fi';
import TablePernyataanRisiko from '@/components/shared/table/TablePernyataanRisiko';
import { Badge } from 'react-bootstrap';

const PernyataanRisikoTabel = ({ generatedStatements, onSelect, selectedId }) => {
    const [currentSelectedId, setCurrentSelectedId] = useState(selectedId || null);

    const handleSelect = (row) => {
        setCurrentSelectedId(row.id);
        onSelect(row);
    };

    useEffect(() => {
        if (selectedId) {
            setCurrentSelectedId(selectedId);
        }
    }, [selectedId]);
    
    const data = (generatedStatements || []).map(item => {
        const isTagFraud = item.tag === 'FRAUD';
        
        return {
            id: item.id,
            pernyataan_risiko: item.pernyataan || item.pernyataan_risiko,
            deskripsi: item.deskripsi,
            generation_id: item.generation_id,
            tag: item.tag || 'NORMAL',
            nama: (
                <>
                    <div>{item.pernyataan || item.pernyataan_risiko}</div>
                    <div className="fw-light text-muted">{item.deskripsi}</div>
                </>
            ),
            tagDisplay: (
                isTagFraud ? (
                    <Badge bg="danger" className="me-1">FRAUD</Badge>
                ) : (
                    <Badge bg="info" className="me-1">AI Generated</Badge>
                )
            )
        };
    });

    const columns = [
        {
            accessorKey: 'nama',
            header: () => 'Pernyataan Risiko',
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
                <button
                    className={`btn btn-sm ${currentSelectedId === info.row.original.id ? 'btn-primary' : 'btn-light-primary'}`}
                    onClick={() => handleSelect(info.row.original)}
                >
                    {currentSelectedId === info.row.original.id ? (
                        <>
                            <FiCheckCircle className="me-1" /> Dipilih
                        </>
                    ) : (
                        'Pilih Data'
                    )}
                </button>

            ),
        },
    ];

    return (
        <TablePernyataanRisiko
            title="Hasil Generate Pernyataan Risiko"
            data={data}
            columns={columns}
        />
    );
};

PernyataanRisikoTabel.propTypes = {
    generatedStatements: PropTypes.array.isRequired,
    onSelect: PropTypes.func.isRequired,
    selectedId: PropTypes.string,
};

export default PernyataanRisikoTabel;
