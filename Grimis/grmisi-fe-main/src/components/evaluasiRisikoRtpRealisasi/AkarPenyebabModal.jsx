import { Modal, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import AkarPenyebabTabel from './AkarPenyebabTabel';
import { PropagateLoader } from 'react-spinners';

const AkarPenyebabModal = ({
    show,
    onClose,
    generatedRootCauses,
    loadingGenerate,
    onSelectAI,
    selectedRootCauseId
}) => {
    return (
        <Modal show={show} onHide={onClose} centered size="xl">
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
                        generatedRootCauses={generatedRootCauses}
                        onSelect={onSelectAI}
                        selectedId={selectedRootCauseId}
                    />
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="light-secondary" onClick={onClose}>
                    Tutup
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

AkarPenyebabModal.propTypes = {
    show: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    generatedRootCauses: PropTypes.array.isRequired,
    loadingGenerate: PropTypes.bool.isRequired,
    onSelectAI: PropTypes.func.isRequired,
    selectedRootCauseId: PropTypes.string
};

export default AkarPenyebabModal;
