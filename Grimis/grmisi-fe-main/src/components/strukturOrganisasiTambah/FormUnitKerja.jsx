import PropTypes from 'prop-types';
import SelectDropdown from '@/components/shared/SelectDropdown';

const FormUnitKerja = ({
    selectedIndukUnitKerja,
    setSelectedIndukUnitKerja,
    indukUnitKerja,
    formData,
    handleUnitKerjaChange,
    provinsiData,
    filteredKota,
    selectedProvinsi,
    setSelectedProvinsi,
    selectedKota,
    setSelectedKota,
    handleJabatanChange
}) => {
    const handleProvinsiChange = (provinsiOption) => {
        setSelectedProvinsi(provinsiOption);
        setTimeout(() => {
            setSelectedKota(null);
            console.log("City selection reset");
        }, 0);
    };

    return (
        <div className="row">
            {/* Induk Unit Kerja */}
            <div className="col-md-6 mb-4">
                <label className="form-label">Induk Unit Kerja <span className="text-danger">*</span></label>
                <SelectDropdown
                    className="select-dropdown-sm"
                    options={indukUnitKerja.map((item) => ({
                        label: item.nama,
                        value: item.id_induk_unit_kerja,
                        kode_induk: item.kode,
                    }))}
                    selectedOption={selectedIndukUnitKerja}
                    onSelectOption={setSelectedIndukUnitKerja}
                    defaultSelect=""
                />
            </div>

            {/* Kode */}
            <div className="col-md-6 mb-4">
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

            {/* Nama & Nama Pendek */}
            <div className="col-md-6 mb-4">
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

            <div className="col-md-6 mb-4">
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

            {/* Pimpinan & Jabatan */}
            <div className="col-md-6 mb-4">
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

            <div className="col-md-6 mb-4">
                <label className="form-label">Jabatan Pimpinan <span className="text-danger">*</span></label>
                <input
                    type="text"
                    className="form-control form-control-sm rounded-4"
                    name="jabatan_pimpinan"
                    placeholder="Jabatan Pimpinan"
                    value={formData.jabatan_pimpinan || ''}
                    onChange={handleJabatanChange}
                    required
                />
            </div>

            {/* Selera Risiko */}
            <div className="col-md-6 mb-4">
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
            <div className="col-md-6 mb-4">{/* spacer for grid balance */}</div>

            {/* Provinsi */}
            <div className="col-md-6 mb-4">
                <label className="form-label">Provinsi <span className="text-danger">*</span></label>
                <SelectDropdown
                    className="select-dropdown-sm"
                    options={provinsiData}
                    selectedOption={selectedProvinsi}
                    onSelectOption={handleProvinsiChange}
                    defaultSelect=""
                />
            </div>

            {/* Kota */}
            <div className="col-md-6 mb-4">
                <label className="form-label">Kota <span className="text-danger">*</span></label>
                <SelectDropdown
                    className="select-dropdown-sm"
                    options={filteredKota}
                    selectedOption={selectedKota}
                    onSelectOption={setSelectedKota}
                    defaultSelect=""
                />
            </div>
        </div>
    );
};

FormUnitKerja.propTypes = {
    selectedIndukUnitKerja: PropTypes.object,
    setSelectedIndukUnitKerja: PropTypes.func.isRequired,
    indukUnitKerja: PropTypes.arrayOf(PropTypes.object).isRequired,
    formData: PropTypes.shape({
        kode: PropTypes.string,
        nama: PropTypes.string,
        nama_pendek: PropTypes.string,
        pimpinan: PropTypes.string,
        jabatan_pimpinan: PropTypes.string,
        selera_risiko: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }).isRequired,
    handleUnitKerjaChange: PropTypes.func.isRequired,
    provinsiData: PropTypes.arrayOf(PropTypes.object).isRequired,
    filteredKota: PropTypes.arrayOf(PropTypes.object).isRequired,
    selectedProvinsi: PropTypes.object,
    setSelectedProvinsi: PropTypes.func.isRequired,
    selectedKota: PropTypes.object,
    setSelectedKota: PropTypes.func.isRequired,
    handleJabatanChange: PropTypes.func.isRequired,
};

export default FormUnitKerja;
