import React, { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import PropTypes from 'prop-types';
import getIcon from '@/utils/getIcon';

const SelectDropdownSkorDampak = ({ options, selectedOption, onSelectOption, className, defaultSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [openUpwards, setOpenUpwards] = useState(false);
    const [localSelectedOption, setLocalSelectedOption] = useState();
    const ref = useRef()
    const dropdownRef = useRef(null);
    const previousOptionsRef = useRef([]);

    // Update local selected option when prop changes
    useEffect(() => {
        if (selectedOption) {
            setLocalSelectedOption(selectedOption);
        }
    }, [selectedOption]);

    // Handle options array changes and maintain selection integrity
    useEffect(() => {
        // Skip if options haven't changed
        if (!options || options === previousOptionsRef.current) {
            return;
        }

        // Store current options for later comparison
        previousOptionsRef.current = options;

        // If we have a local selection, check if it still exists in new options
        if (localSelectedOption) {
            const stillExists = options.some(
                option => option.value === localSelectedOption.value
            );

            if (!stillExists) {
                // Option no longer exists, reset local selection or use default
                if (defaultSelect) {
                    const defaultValue = typeof defaultSelect === "string" 
                        ? defaultSelect.toLowerCase() 
                        : String(defaultSelect);
                    const defaultOption = options.find(
                        option => String(option.value).toLowerCase() === defaultValue
                    );
                    setLocalSelectedOption(defaultOption || null);
                } else {
                    setLocalSelectedOption(null);
                }
            } else {
                // Update local option with new data from options array
                const updatedOption = options.find(
                    option => option.value === localSelectedOption.value
                );
                if (updatedOption && JSON.stringify(updatedOption) !== JSON.stringify(localSelectedOption)) {
                    setLocalSelectedOption(updatedOption);
                }
            }
        }
    }, [options, localSelectedOption, defaultSelect]);

    useEffect(() => {
        if (!localSelectedOption && defaultSelect && options?.length) {
            // Set default value hanya jika belum ada yang dipilih
            const defaultValue = typeof defaultSelect === "string" ? defaultSelect.toLowerCase() : String(defaultSelect);
            const defaultOption = options.find(option => String(option.value).toLowerCase() === defaultValue);
            setLocalSelectedOption(defaultOption || null);
        }

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [defaultSelect, localSelectedOption, options]);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const filteredOptions = options?.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            const dropdown = dropdownRef.current;
            const dropdownRect = dropdown.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            if (dropdownRect.bottom + 200 > windowHeight) {
                setOpenUpwards(true);
            } else {
                setOpenUpwards(false);
            }
        }
    }, [isOpen]);

    const handleOptionClick = (option) => {
        onSelectOption(option); // Notify parent of the selected option
        setLocalSelectedOption(option);
        setIsOpen(false); // Close the dropdown
    };

    return (
        <div className={`select-dropdown select-dropdown-sm ${className ? className : ""} ${openUpwards ? 'open-upwards' : ''} rounded-4`} ref={dropdownRef}>
            <div className={"select-box select-box-sm rounded-4"} onClick={toggleDropdown}>
                {localSelectedOption ? (
                    <div className="d-flex align-items-center">
                        <span className={`badge ${localSelectedOption.color} me-2 px-2 py-1`}>&nbsp;</span>
                        <span className="me-2">{localSelectedOption.label}</span>
                        {localSelectedOption.persentase && (
                            <span className={`badge ${localSelectedOption.color}`}>
                                {localSelectedOption.persentase}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-muted">Pilih Skor Dampak...</span>
                )}
                <span className="arrow">{isOpen ? <FiChevronUp /> : <FiChevronDown />}</span>
            </div>

            {isOpen && (
                <div className="dropdown-list">
                    <div className='search-input-outer'>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <ul>
                        {filteredOptions?.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.value}
                                    onClick={() => handleOptionClick(option)}
                                    className={`${option?.value === localSelectedOption?.value ? 'active' : ''} d-flex align-items-center`}
                                >
                                    <span className={`badge ${option.color} me-2 px-2 py-1`}>&nbsp;</span>
                                    <span className="me-2">{option.label}</span>
                                    {option.persentase && (
                                        <span className={`badge ${option.color} px-2 py-1`}>{option.persentase}</span>
                                    )}
                                </li>
                            ))
                        ) : (
                            <li className="no-result">No results found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

SelectDropdownSkorDampak.propTypes = {
    options: PropTypes.array.isRequired,
    selectedOption: PropTypes.object,
    onSelectOption: PropTypes.func.isRequired,
    className: PropTypes.string,
    defaultSelect: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default SelectDropdownSkorDampak;