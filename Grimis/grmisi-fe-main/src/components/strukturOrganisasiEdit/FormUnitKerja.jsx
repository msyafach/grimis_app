import PropTypes from 'prop-types';
import SelectDropdown from '@/components/shared/SelectDropdown';

const FormUnitKerja = ({
    formData,
    handleUnitKerjaChange,
    provinsiData,
    selectedProvinsi,
    setSelectedProvinsi,
    selectedKota,
    setSelectedKota,
    filteredKota
}) => {
    const handleSelectProvinsi = (option) => {
        setSelectedProvinsi(option);
        handleUnitKerjaChange({
            target: {
                name: 'provinsi',
                value: option?.label || '',
            }
        });
    };

    const handleSelectKota = (option) => {
        setSelectedKota(option);
        handleUnitKerjaChange({
            target: {
                name: 'kota',
                value: option?.label || '',
            }
        });
    };

    return (
        <div className="row">
            <div className="row">
                <div className="col-lg-6">
                    <div className="mb-4">
                        <label className="form-label">Induk Unit Kerja <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="nama_induk_unit"
                            value={formData.nama_induk_unit || ''}
                            required
                            disabled
                        />
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-4">
                        <label className="form-label">Kode <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4"
                            name="kode"
                            placeholder="Kode"
                            value={formData.kode || ''}
                            onChange={handleUnitKerjaChange}
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-6">
                    <div className="mb-4">
                        <label className="form-label">Nama <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4"
                            name="nama"
                            placeholder="Nama"
                            value={formData.nama || ''}
                            onChange={handleUnitKerjaChange}
                            required
                        />
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-4">
                        <label className="form-label">Nama Pendek <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4"
                            name="nama_pendek"
                            placeholder="Nama Pendek"
                            value={formData.nama_pendek || ''}
                            onChange={handleUnitKerjaChange}
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-6">
                    <div className="mb-4">
                        <label className="form-label">Pimpinan</label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4"
                            name="pimpinan"
                            placeholder="Pimpinan"
                            value={formData.pimpinan || ''}
                            onChange={handleUnitKerjaChange}
                        />
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-4">
                        <label className="form-label">Jabatan Pimpinan <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4"
                            name="jabatan_pimpinan"
                            placeholder="Jabatan Pimpinan"
                            value={formData.jabatan_pimpinan || ''}
                            onChange={handleUnitKerjaChange}
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-6">
                    <div className="mb-4">
                        <label className="form-label">Selera Risiko <span className="text-danger">*</span></label>
                        <input
                            type="number"
                            className="form-control form-control-sm rounded-4"
                            name="selera_risiko"
                            placeholder="Selera Risiko"
                            value={formData.selera_risiko || 0}
                            onChange={handleUnitKerjaChange}
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-6">
                    <div className="mb-4">
                        <label className="form-label">Provinsi <span className="text-danger">*</span></label>
                        <SelectDropdown
                            className="rounded-4"
                            options={provinsiData}
                            selectedOption={selectedProvinsi}
                            onSelectOption={handleSelectProvinsi}
                            defaultSelect=""
                        />
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-4">
                        <label className="form-label">Kota <span className="text-danger">*</span></label>
                        <SelectDropdown
                            className="rounded-4"
                            options={filteredKota}
                            selectedOption={selectedKota}
                            onSelectOption={handleSelectKota}
                            defaultSelect=""
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

FormUnitKerja.propTypes = {
    formData: PropTypes.shape({
        nama_induk_unit: PropTypes.string,
        kode: PropTypes.string,
        nama: PropTypes.string,
        nama_pendek: PropTypes.string,
        pimpinan: PropTypes.string,
        jabatan_pimpinan: PropTypes.string,
        selera_risiko: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        provinsi: PropTypes.string,
        kota: PropTypes.string,
    }).isRequired,
    handleUnitKerjaChange: PropTypes.func.isRequired,
    provinsiData: PropTypes.arrayOf(PropTypes.object).isRequired,
    selectedProvinsi: PropTypes.object,
    setSelectedProvinsi: PropTypes.func.isRequired,
    selectedKota: PropTypes.object,
    setSelectedKota: PropTypes.func.isRequired,
    filteredKota: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default FormUnitKerja;
