import React from 'react';
import { FiTrash } from 'react-icons/fi';

const FormJenisKonteks = ({ sasaranData, probisData, onSasaranChange, onProbisChange }) => {

    // Menangani perubahan input SASARAN
    const handleSasaranChange = (e) => {
        const { name, value } = e.target;
        const updatedSasaran = [{ ...sasaranData[0], [name]: value }];
        onSasaranChange(updatedSasaran);
    };

    // Menangani perubahan input PROBIS
    const handleProbisChange = (e) => {
        const { name, value } = e.target;
        const updatedProbis = [{ ...probisData[0], [name]: value }];
        onProbisChange(updatedProbis);
    };

    return (
        <div>
            <h5 className="fw-bold">Jenis Konteks</h5>
            <div className="row">
                {/* SASARAN Section */}
                <div className="col-lg-6 mb-4">
                    <h6 className="fw-bold">SASARAN</h6>
                    <div className="row mb-3">
                        <div className="col-lg-3 mb-4">
                            <label className="form-label">Kode Sasaran<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3"
                                name="kode"
                                placeholder="Kode Sasaran"
                                value={sasaranData[0]?.kode || ''}
                                onChange={handleSasaranChange}
                                required
                            />
                        </div>
                        <div className="col-lg-8 mb-4">
                            <label className="form-label">Nama Sasaran <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3"
                                name="nama"
                                placeholder="Nama Sasaran"
                                value={sasaranData[0]?.nama || ''}
                                onChange={handleSasaranChange}
                                required
                            />
                        </div>
                        <div className="col-lg-1 mb-4">
                            {/* Hapus tombol hapus */}
                        </div>
                    </div>
                    {/* Hapus tombol tambah */}
                </div>

                {/* PROBIS Section */}
                <div className="col-lg-6 mb-4">
                    <h6 className="fw-bold">PROBIS</h6>
                    <div className="row mb-3">
                        <div className="col-lg-3 mb-4">
                            <label className="form-label">Kode Probis<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3"
                                name="kode"
                                placeholder="Kode"
                                value={probisData[0]?.kode || ''}
                                onChange={handleProbisChange}
                                required
                            />
                        </div>
                        <div className="col-lg-8 mb-4">
                            <label className="form-label">Nama Probis <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3"
                                name="nama"
                                placeholder="Nama Probis"
                                value={probisData[0]?.nama || ''}
                                onChange={handleProbisChange}
                                required
                            />
                        </div>
                        <div className="col-lg-1 mb-4">
                            {/* Hapus tombol hapus */}
                        </div>
                    </div>
                    {/* Hapus tombol tambah */}
                </div>
            </div>
        </div>
    );
};

export default FormJenisKonteks;
