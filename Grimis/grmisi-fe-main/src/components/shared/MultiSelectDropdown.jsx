import React from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';

const MultiSelectDropdown = ({ 
    options, 
    selectedOptions, 
    onChange, 
    placeholder = "Select options...",
    isDisabled = false,
    className = ""
}) => {
    return (
        <Select
            value={selectedOptions}
            isMulti
            name="multi-select"
            options={options}
            className={`basic-multi-select ${className}`}
            classNamePrefix="select"
            placeholder={placeholder}
            onChange={onChange}
            isDisabled={isDisabled}
            styles={{
                control: (baseStyles, state) => ({
                    ...baseStyles,
                    padding: state.hasValue ? '6px 12px' : '13px',
                    borderColor: '#e9ecef',
                    boxShadow: 'none',
                    '&:hover': {
                        borderColor: '#ced4da'
                    }
                }),
                multiValue: (baseStyles) => ({
                    ...baseStyles,
                    backgroundColor: '#f1f5f9',
                    borderRadius: '4px',
                }),
                multiValueLabel: (baseStyles) => ({
                    ...baseStyles,
                    color: '#475569',
                    fontWeight: 500,
                }),
                multiValueRemove: (baseStyles) => ({
                    ...baseStyles,
                    color: '#94a3b8',
                    ':hover': {
                        backgroundColor: '#e2e8f0',
                        color: '#64748b',
                    },
                }),
            }}
        />
    );
};

MultiSelectDropdown.propTypes = {
    options: PropTypes.array.isRequired,
    selectedOptions: PropTypes.array,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    isDisabled: PropTypes.bool,
    className: PropTypes.string
};

export default MultiSelectDropdown; 