import { Modal, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import AkarPenyebabTabel from './AkarPenyebabTabel';
import { PropagateLoader } from 'react-spinners';

const AkarPenyebabModal = ({
    setShowModal,
    show,
    onClose,
    generatedRootCauses,
    loadingGenerate,
    onSelectAI,
    selectedRootCauseId,
    tempEntries,
    currentEditIndex,
    isEditMode,
    onClearTempEntries
}) => {
    const tabelRef = useRef();
    const [isAllSelected, setIsAllSelected] = useState(false);

    const handleToggleSelectAll = () => {
        if (tabelRef.current) {
            if (tabelRef.current.isAllSelected()) {
                tabelRef.current.clearAll();
                setIsAllSelected(false);
                onClearTempEntries();
            } else {
                tabelRef.current.selectAll();
                setIsAllSelected(true);
            }
        }
    };

    return (
        <Modal show={show} onHide={onClose} centered size="xl" dialogClassName="modal-dialog-scrollable">
            <Modal.Header closeButton>
                <Modal.Title className="fs-6">Hasil Generate Akar Penyebab</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {loadingGenerate ? (
                    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                        <PropagateLoader color="#021526" size={15} />
                    </div>
                ) : (
                    <AkarPenyebabTabel
                        ref={tabelRef}
                        generatedRootCauses={generatedRootCauses}
                        onSelect={onSelectAI}
                        selectedTempIds={tempEntries.map(e => e.root_cause_id)}
                    />
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="light-secondary" onClick={() => setShowModal(false)}>
                    Tutup
                </Button>
                {!isEditMode && (
                    <Button variant="primary" onClick={handleToggleSelectAll}>
                        {isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </Button>
                )}

            </Modal.Footer>
        </Modal>
    );
};

AkarPenyebabModal.propTypes = {
    setShowModal: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    generatedRootCauses: PropTypes.array.isRequired,
    loadingGenerate: PropTypes.bool.isRequired,
    onSelectAI: PropTypes.func.isRequired,
    selectedRootCauseId: PropTypes.string,
    tempEntries: PropTypes.array.isRequired,
    currentEditIndex: PropTypes.number.isRequired,
    isEditMode: PropTypes.bool.isRequired,
};

export default AkarPenyebabModal;
