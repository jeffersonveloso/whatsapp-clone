import {Input} from "@/components/ui/input";
import {Search} from "lucide-react";

const SearchBar = ({
                       filterText,
                       placeholder,
                       onFilterTextChange,
                       className
                   }: {
    filterText: string;
    placeholder: string;
    onFilterTextChange: (value: string) => void;
    className: string
}) => {
    return (
    <div className={className}>
        <Search
            className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10'
            size={18}
        />
        <Input
            type='text'
            value={filterText}
            placeholder={placeholder}
            onChange={(e) => onFilterTextChange(e.target.value)}
            className='pl-10 py-2 text-sm w-full rounded shadow-sm bg-gray-primary focus-visible:ring-transparent'
        />
    </div>
    );
};

export default SearchBar;
