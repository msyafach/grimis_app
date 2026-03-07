import React, { useState } from 'react'
import { Button, Modal, Row, Col } from 'react-bootstrap'
import { FiCopy, FiLink } from 'react-icons/fi'
import { BsQrCodeScan } from 'react-icons/bs'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'
import API_ENDPOINTS from '@/config/apiConfig'
import { useInstansi } from '@/context/InstansiContext'
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext'
import { useTahun } from '@/context/TahunContext'
import { showToast } from '@/utils/toast'

const LaporanKejadianModal = () => {
    const [show, setShow] = useState(false)
    const [loading, setLoading] = useState(false)
    const [generatedLink, setGeneratedLink] = useState('')
    const navigate = useNavigate()
    const { idInstansi } = useInstansi()
    const { idIndukUnitKerja } = useIndukUnitKerja()
    const { tahunId } = useTahun()

    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const generateLink = async () => {
        if (!idInstansi || !idIndukUnitKerja) {
            showToast('error', 'Silakan pilih instansi dan induk unit kerja terlebih dahulu')
            return
        }

        if (!tahunId) {
            showToast('error', 'Silakan pilih tahun terlebih dahulu')
            return
        }

        try {
            setLoading(true)
            const token = localStorage.getItem('access_token')
            const response = await axios.post(
                `${API_ENDPOINTS.generateAnonymousLink()}?id_instansi=${idInstansi}&id_induk_unit_kerja=${idIndukUnitKerja}&tahun=${tahunId}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            )

            if (response.data && response.data.link) {
                // The API now returns a link with a reference_id instead of a token
                // The format is already /laporan-kejadian/{referenceId}
                const baseUrl = window.location.origin
                const fullUrl = `${baseUrl}${response.data.link}`
                setGeneratedLink(fullUrl)
                showToast('success', `Link berhasil dibuat untuk tahun ${tahunId}`)
            } else {
                showToast('error', 'Gagal membuat link')
            }
        } catch (error) {
            console.error('Error generating link:', error)
            showToast('error', 'Gagal membuat link: ' + (error.response?.data?.message || error.message))
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink)
        showToast('success', 'Link berhasil disalin')
    }

    return (
        <>
            <div className="nxl-h-item me-3">
                <div className="nxl-head-link" onClick={handleShow} title="Laporan Kejadian">
                    <div className="bg-white rounded-circle p-1 d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px' }}>
                        <BsQrCodeScan size={16} className="text-primary" />
                    </div>
                </div>
            </div>

            <Modal
                show={show}
                onHide={handleClose}
                centered
                backdrop="static"
                keyboard={false}
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Generate Link Laporan Kejadian {tahunId && `- Tahun ${tahunId}`}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-4">
                        <p className="text-muted">
                            Anda dapat membuat link untuk pelaporan kejadian. Link yang dibuat akan terkait dengan tahun {tahunId}.
                        </p>
                    </div>

                    <div className="d-grid mb-4">
                        <Button 
                            variant="primary" 
                            onClick={generateLink} 
                            disabled={loading || !idInstansi || !idIndukUnitKerja || !tahunId}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Membuat Link...
                                </>
                            ) : (
                                'Generate Link Anonim'
                            )}
                        </Button>
                    </div>

                    {generatedLink && (
                        <div className="mt-4 p-4 bg-light rounded-3 border shadow-sm">
                            <Row className="align-items-center">
                                <Col md={4} className="d-flex justify-content-center mb-3 mb-md-0">
                                    <div className="bg-white p-3 rounded-3 shadow-sm">
                                        <QRCodeSVG value={generatedLink} size={150} />
                                    </div>
                                </Col>
                                <Col md={8}>
                                    <h5 className="mb-3">Link Laporan Anonim</h5>
                                    <div className="d-flex align-items-center mb-3">
                                        <div className="flex-grow-1 text-truncate bg-white p-2 rounded border">
                                            <span className="text-primary small">{generatedLink}</span>
                                        </div>
                                        <Button 
                                            variant="primary" 
                                            size="sm" 
                                            className="ms-2"
                                            onClick={copyToClipboard}
                                        >
                                            <FiCopy size={14} className="me-1" /> Salin
                                        </Button>
                                    </div>
                                    <div className="alert alert-info p-2 mb-0 small">
                                        <p className="mb-0">
                                            <strong>Petunjuk:</strong> Scan kode QR atau bagikan link untuk melaporkan kejadian secara anonim.
                                            Link ini akan kedaluwarsa dalam 24 jam.
                                        </p>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </>
    )
}

export default LaporanKejadianModal 