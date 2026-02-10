import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronsUpDown } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface MultiSelectProps {
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    label?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selectedValues, onChange, placeholder = "Select...", label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (value: string) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        } else {
            onChange([...selectedValues, value]);
        }
    };

    const removeValue = (e: React.MouseEvent, value: string) => {
        e.stopPropagation();
        onChange(selectedValues.filter(v => v !== value));
    };

    const getSelectedLabels = () => {
        return selectedValues.map(v => options.find(o => o.value === v)?.label || v);
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

            <div
                className="min-h-[38px] w-full border border-gray-300 rounded-md bg-white p-1 flex flex-wrap gap-1 items-center cursor-text focus-within:ring-2 focus-within:ring-[#404E3B] focus-within:border-[#404E3B]"
                onClick={() => setIsOpen(true)}
            >
                {selectedValues.length === 0 && (
                    <span className="text-gray-400 text-sm ml-2 select-none pointer-events-none absolute">{placeholder}</span>
                )}

                {getSelectedLabels().map((label, index) => (
                    <span key={selectedValues[index]} className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded-md flex items-center border border-gray-200">
                        {label}
                        <button
                            type="button"
                            onClick={(e) => removeValue(e, selectedValues[index])}
                            className="ml-1 text-gray-500 hover:text-red-500 focus:outline-none"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}

                <div className="flex-1 min-w-[60px]">
                    <input
                        type="text"
                        className="w-full border-none p-1 text-sm focus:ring-0"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsOpen(true);
                        }}
                        placeholder={selectedValues.length === 0 ? "" : ""}
                    />
                </div>

                <div className="mr-2 text-gray-400">
                    <ChevronsUpDown className="w-4 h-4" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <div
                                key={option.value}
                                className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center hover:bg-gray-50 ${selectedValues.includes(option.value) ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                                onClick={() => handleSelect(option.value)}
                            >
                                <span>{option.label}</span>
                                {selectedValues.includes(option.value) && <Check className="w-4 h-4" />}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">No results found</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
