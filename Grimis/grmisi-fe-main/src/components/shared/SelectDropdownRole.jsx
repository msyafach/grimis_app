import React, { useEffect, useState } from 'react';

const SelectDropdownRole = ({ options, selectedOption, onSelectOption, defaultSelect }) => {
    const [localSelectedOption, setLocalSelectedOption] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Update localSelectedOption based on selectedOption prop
    useEffect(() => {
        if (selectedOption) {
            setLocalSelectedOption(selectedOption);
        } else {
            // Reset localSelectedOption when selectedOption is null
            setLocalSelectedOption(null);
        }
    }, [selectedOption]); // Update whenever selectedOption changes

    const toggleDropdown = () => setIsOpen(!isOpen);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOptionClick = (option) => {
        onSelectOption(option); // Pass selected option to parent
        setLocalSelectedOption(option); // Update local selected option
        setIsOpen(false); // Close dropdown
    };

    return (
        <div className="select-dropdown" onClick={toggleDropdown}>
            <div className="select-box">
                {localSelectedOption ? (
                    <span>{localSelectedOption.label}</span>
                ) : (
                    <span className="text-muted">{defaultSelect || 'Pilih ...'}</span>
                )}
            </div>

            {isOpen && (
                <div className="dropdown-list">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <ul>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.value}
                                    onClick={() => handleOptionClick(option)}
                                    className={option.value === localSelectedOption?.value ? 'active' : ''}
                                >
                                    {option.label}
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

export default SelectDropdownRole;
