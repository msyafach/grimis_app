import { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import PropTypes from 'prop-types';
import PernyataanRisikoTabel from './PernyataanRisikoTabel';
import { PropagateLoader } from 'react-spinners';

const PernyataanRisikoModal = ({
    show,
    onClose,
    generatedStatements,
    loadingGenerate,
    onSelectAI,
    selectedStatementId,
    onGenerate
}) => {
    const [statementCount, setStatementCount] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [localStatements, setLocalStatements] = useState([]);

    // Sync local statements with prop when they change
    useEffect(() => {
        setLocalStatements(generatedStatements);
    }, [generatedStatements]);

    const handleGenerate = () => {
        setIsGenerating(true);
        onGenerate(statementCount);
    };

    const handleClose = () => {
        setIsGenerating(false);
        onClose();
    };

    const handleGenerateAgain = () => {
        setIsGenerating(false);
        setLocalStatements([]);
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="xl">
            <Modal.Header closeButton>
                <Modal.Title>Generate Pernyataan Risiko</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {!isGenerating && localStatements.length === 0 ? (
                    <div className="p-3">
                        <Form.Group className="mb-3">
                            <Form.Label>Jumlah pernyataan yang ingin digenerate</Form.Label>
                            <Form.Control 
                                type="number" 
                                min={1} 
                                max={10} 
                                value={statementCount} 
                                onChange={(e) => setStatementCount(parseInt(e.target.value) || 1)}
                            />
                            <Form.Text className="text-muted">
                                Masukkan jumlah pernyataan risiko yang ingin digenerate
                            </Form.Text>
                        </Form.Group>
                        <div className="d-flex justify-content-end">
                            <Button variant="primary" onClick={handleGenerate}>
                                Generate Pernyataan
                            </Button>
                        </div>
                    </div>
                ) : loadingGenerate ? (
                    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                        <PropagateLoader color="#021526" size={15} />
                    </div>
                ) : (
                    <PernyataanRisikoTabel
                        generatedStatements={localStatements}
                        onSelect={onSelectAI}
                        selectedId={selectedStatementId}
                    />
                )}
            </Modal.Body>

            <Modal.Footer>
                {isGenerating && localStatements.length > 0 && (
                    <Button variant="outline-primary" onClick={handleGenerateAgain}>
                        Generate Ulang
                    </Button>
                )}
                <Button variant="light-secondary" onClick={handleClose}>
                    {isGenerating && localStatements.length > 0 ? 'Tutup' : 'Batal'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

PernyataanRisikoModal.propTypes = {
    show: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    generatedStatements: PropTypes.array.isRequired,
    loadingGenerate: PropTypes.bool.isRequired,
    onSelectAI: PropTypes.func.isRequired,
    selectedStatementId: PropTypes.string,
    onGenerate: PropTypes.func.isRequired
};

export default PernyataanRisikoModal;
