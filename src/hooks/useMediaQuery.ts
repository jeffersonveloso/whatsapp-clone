import { useEffect, useState } from "react";

export const useMediaQuery = (query: string) => {
	const getMatches = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);

	const [matches, setMatches] = useState<boolean>(getMatches);

	useEffect(() => {
		const mediaQueryList = window.matchMedia(query);
		const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

		setMatches(mediaQueryList.matches);
		mediaQueryList.addEventListener("change", listener);

		return () => mediaQueryList.removeEventListener("change", listener);
	}, [query]);

	return matches;
};
