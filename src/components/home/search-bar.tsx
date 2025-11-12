import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchBarProps = {
	filterText: string;
	placeholder: string;
	onFilterTextChange: (value: string) => void;
	className?: string;
};

const SearchBar = ({
	filterText,
	placeholder,
	onFilterTextChange,
	className,
}: SearchBarProps) => {
	return (
		<div className={cn("relative flex w-full items-center", className)}>
			<Search
				className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
				size={18}
			/>
			<Input
				type='text'
				value={filterText}
				placeholder={placeholder}
				onChange={(e) => onFilterTextChange(e.target.value)}
				className='h-10 w-full rounded-md border border-border bg-background pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'
			/>
		</div>
	);
};

export default SearchBar;
