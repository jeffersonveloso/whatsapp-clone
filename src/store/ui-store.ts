import { create } from "zustand";

type SidebarState = {
	isSidebarOpen: boolean;
	open: () => void;
	close: () => void;
	toggle: () => void;
};

type GroupInfoState = {
	isGroupInfoOpen: boolean;
	open: () => void;
	close: () => void;
	toggle: () => void;
};

export const useSidebarStore = create<SidebarState>((set) => ({
	isSidebarOpen: false,
	open: () => set({ isSidebarOpen: true }),
	close: () => set({ isSidebarOpen: false }),
	toggle: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

export const useGroupInfoStore = create<GroupInfoState>((set) => ({
	isGroupInfoOpen: false,
	open: () => set({ isGroupInfoOpen: true }),
	close: () => set({ isGroupInfoOpen: false }),
	toggle: () => set((state) => ({ isGroupInfoOpen: !state.isGroupInfoOpen })),
}));
