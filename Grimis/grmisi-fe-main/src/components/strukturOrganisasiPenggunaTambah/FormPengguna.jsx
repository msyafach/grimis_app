import PropTypes from 'prop-types';
import SelectDropdown from '@/components/shared/SelectDropdown';

const FormPengguna = ({
    dataPengguna,
    selectedPengguna,
    setSelectedPengguna,
}) => {
    return (
        <div className="row">
            <div className="col-12">
                <div className="mb-4">
                    <label className="form-label">Pengguna<span className="text-danger">*</span></label>
                    <SelectDropdown
                        className="form-select-sm"
                        options={dataPengguna.map((item) => ({
                            label: item.email,
                            value: item.id,
                        }))}
                        selectedOption={selectedPengguna}
                        onSelectOption={setSelectedPengguna}
                        defaultSelect=""
                    />
                </div>
            </div>
        </div>
    );
};

FormPengguna.propTypes = {
    dataPengguna: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.any.isRequired,
            email: PropTypes.string.isRequired,
        })
    ).isRequired,
    selectedPengguna: PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.any,
    }),
    setSelectedPengguna: PropTypes.func.isRequired,
};


export default FormPengguna;
