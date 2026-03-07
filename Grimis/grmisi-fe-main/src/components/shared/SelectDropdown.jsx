import React, { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import PropTypes from 'prop-types';
import getIcon from '@/utils/getIcon';

const SelectDropdown = ({ options, selectedOption, onSelectOption, className, defaultSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [openUpwards, setOpenUpwards] = useState(false);
    const [localSelectedOption, setLocalSelectedOption] = useState();
    const ref = useRef()
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (selectedOption) {
            setLocalSelectedOption(selectedOption);
        }
    }, [selectedOption]);

    useEffect(() => {
        if (!localSelectedOption && defaultSelect) {
            const defaultValue = typeof defaultSelect === "string" ? defaultSelect.toLowerCase() : String(defaultSelect);
            const defaultOption = options?.find(option => String(option.value).toLowerCase() === defaultValue);
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
        // option.label.toLowerCase().includes(searchTerm.toLowerCase())
        option?.label && option.label.toLowerCase().includes(searchTerm.toLowerCase())
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
        onSelectOption(option);
        setLocalSelectedOption(option);
        setIsOpen(false);
    };

    return (
        <div className={`select-dropdown select-dropdown-sm ${className ? className : ""} ${openUpwards ? 'open-upwards' : ''}`} ref={dropdownRef}>
            <div className={"select-box select-box-sm rounded-4"} onClick={toggleDropdown}>
                {localSelectedOption ? (
                    <div className="d-flex align-items-center">
                        <span>{localSelectedOption.label}</span>
                    </div>
                ) : (
                    <span className="text-muted">Pilih ...</span>
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
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.value}
                                    onClick={() => handleOptionClick(option)}
                                    className={`${option?.value === localSelectedOption?.value ? 'active' : ''}`}
                                >
                                    {option?.color ? <span className="status-dot" style={{ backgroundColor: option?.color }}></span> : ""}
                                    {option?.icon ? <span className={`lh-1 me-3 fs-16 ${option.iconClassName}`}>{getIcon(option?.icon)}</span> : ""}
                                    {option?.img ? <img src={option.img} className="avatar-image avatar-sm me-2" /> : ""}

                                    {option?.label}
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

export default SelectDropdown;

// SelectDropdown.propTypes = {
//     options: PropTypes.array.isRequired,
//     defaultSelect: PropTypes.number,
//     currentSelect: PropTypes.func
// };

// SelectDropdown.defaultProps = {
//     currentSelect: () => { }
// };