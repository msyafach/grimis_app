import React, { useState } from 'react';
import Select from 'react-select';

const years = [
    { value: 2025, label: '2025' },
    { value: 2024, label: '2024' },
    { value: 2023, label: '2023' },
    { value: 2022, label: '2022' },
    { value: 2021, label: '2021' }
];

const YearDropdown = () => {
    const [selectedYear, setSelectedYear] = useState(years[0]);

    return (
        <div className="dropdown nxl-h-item">
            <Select
                options={years}
                value={selectedYear}
                onChange={setSelectedYear}
                styles={{
                    control: (base) => ({
                        ...base,
                        backgroundColor: 'white',
                        color: 'black',
                        borderRadius: '8px',
                        padding: '4px',
                        minWidth: '80px'
                    }),
                    singleValue: (base) => ({
                        ...base,
                        color: 'black'
                    })
                }}
            />
        </div>
    );
};

export default YearDropdown;
