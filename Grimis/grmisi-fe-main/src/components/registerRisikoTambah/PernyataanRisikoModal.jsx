import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import 'react-quill/dist/quill.snow.css';
import PernyataanRisikoTabel from './PernyataanRisikoTabel';

const PernyataanRisikoModal = ({ generatedStatements, loadingGenerate }) => {

    return (
        <div className="modal fade-scale" id="pernyataanRisikoModal" tabIndex="-1" aria-labelledby="pernyataanRisikoModal" aria-hidden="true" data-bs-dismiss="ou">
            <div className="modal-dialog modal-dialog-centered modal-xl" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Pernyataan Risiko</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        {loadingGenerate ? (
                            <p>Loading AI data...</p>
                        ) : (
                            <PernyataanRisikoTabel generatedStatements={generatedStatements} />
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-light-danger" data-bs-dismiss="modal">Batal</button>
                        <button type="button" className="btn btn-primary" data-bs-dismiss="modal">Simpan</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PernyataanRisikoModal