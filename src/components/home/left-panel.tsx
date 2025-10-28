"use client";
import { ListFilter, X } from "lucide-react";
import ThemeSwitch from "./theme-switch";
import Conversation from "./conversation";
import { UserButton } from "@clerk/nextjs";

import UserListDialog from "./user-list-dialog";
import {useConvexAuth, useQuery} from "convex/react";
import { api } from "../../../convex/_generated/api";
import React, {useCallback, useEffect, useRef} from "react";
import { useConversationStore } from "@/store/chat-store";
import SearchBar from "@/components/home/search-bar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSidebarStore } from "@/store/ui-store";
import {useRouter, useSearchParams} from "next/navigation";

const LeftPanel = () => {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const conversations = useQuery(api.conversations.getMyConversations, isAuthenticated ? undefined : "skip");
	const { selectedConversation, setSelectedConversation } = useConversationStore();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const { isSidebarOpen, close } = useSidebarStore();
	const router = useRouter();
	const searchParams = useSearchParams();
	const conversationIdParam = searchParams?.get("conversationId") ?? null;
	const selectionOriginRef = useRef<"user" | "route" | null>(null);

	const setConversationParam = useCallback(
		(conversationId: string | null) => {
			const currentId = conversationIdParam;
			if (conversationId === currentId) {
				return;
			}

			const currentParams = new URLSearchParams(searchParams?.toString() ?? "");
			if (conversationId) {
				currentParams.set("conversationId", conversationId);
			} else {
				currentParams.delete("conversationId");
			}

			const query = currentParams.toString();
			router.replace(query ? `/?${query}` : "/", { scroll: false });
		},
		[conversationIdParam, router, searchParams],
	);

	useEffect(() => {
		const conversationIds = conversations?.map((conversation) => conversation._id);
		if (selectedConversation && conversationIds && !conversationIds.includes(selectedConversation._id)) {
			selectionOriginRef.current = "route";
			setSelectedConversation(null);
			if (conversationIdParam) {
				setConversationParam(null);
			}
		}
	}, [conversationIdParam, conversations, selectedConversation, setConversationParam, setSelectedConversation]);

	useEffect(() => {
		if (isDesktop) {
			close();
		}
	}, [isDesktop, close]);

	useEffect(() => {
		if (!conversations) {
			return;
		}

		if (!conversationIdParam) {
			if (selectedConversation) {
				selectionOriginRef.current = "route";
				setSelectedConversation(null);
			}
			return;
		}

		const target = conversations.find((conversation) => conversation._id === conversationIdParam);
		if (target) {
			if (!selectedConversation || selectedConversation._id !== target._id) {
				selectionOriginRef.current = "route";
				setSelectedConversation(target);
			}
		} else if (selectedConversation) {
			selectionOriginRef.current = "route";
			setSelectedConversation(null);
		}
	}, [conversationIdParam, conversations, selectedConversation, setSelectedConversation]);

	useEffect(() => {
		if (selectionOriginRef.current === "route") {
			selectionOriginRef.current = null;
			return;
		}

		if (selectedConversation && selectedConversation._id !== conversationIdParam) {
			selectionOriginRef.current = "user";
			setConversationParam(selectedConversation._id);
			return;
		}

		if (!selectedConversation && conversationIdParam) {
			selectionOriginRef.current = "user";
			setConversationParam(null);
			return;
		}

		if (selectionOriginRef.current === "user") {
			selectionOriginRef.current = null;
		}
	}, [conversationIdParam, selectedConversation, setConversationParam]);

	if (isLoading) return null;

	const handleConversationSelect = (conversation: any) => {
		selectionOriginRef.current = "user";
		setSelectedConversation(conversation);
		setConversationParam(conversation._id);
		if (!isDesktop) close();
	};

	const sidebarBody = (
		<div className='flex h-full w-full flex-col bg-left-panel border-gray-600 border-r'>
			<div className='sticky top-0 bg-left-panel z-10'>
				<div className='flex justify-between bg-gray-primary p-3 items-center'>
					<UserButton />
					<div className='flex items-center gap-3'>
						{isAuthenticated && <UserListDialog />}
						<ThemeSwitch />
						<button
							type='button'
							className='md:hidden text-sm text-muted-foreground hover:text-foreground transition'
							onClick={close}
							aria-label='Close conversations menu'
						>
							<X size={18} />
						</button>
					</div>
				</div>
				<div className='p-3 flex items-center'>
					<SearchBar
						placeholder='Search or start a new chat'
						filterText=''
						onFilterTextChange={() => {}}
						className='relative h-10 mx-3 flex-1'
					/>
					<ListFilter className='cursor-pointer' />
				</div>
			</div>

			<div className='my-3 flex flex-1 flex-col gap-0 overflow-auto min-h-0'>
				{conversations?.map((conversation) => (
					<Conversation
						key={conversation._id}
						conversation={conversation}
						onSelect={() => handleConversationSelect(conversation)}
					/>
				))}

				{conversations?.length === 0 && (
					<>
						<p className='text-center text-gray-500 text-sm mt-3'>No conversations yet</p>
						<p className='text-center text-gray-500 text-sm mt-3 '>
							We understand {"you're"} an introvert, but {"you've"} got to start somewhere 😊
						</p>
					</>
				)}
			</div>
		</div>
	);

	return (
		<>
			<div className='hidden flex-shrink-0 md:flex md:h-full md:w-1/4 md:max-w-sm'>{sidebarBody}</div>

			{!isDesktop && (
				<div
					className={`fixed inset-0 z-[70] flex md:hidden transition-opacity duration-200 ${
						isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
					}`}
				>
					<div
						className={`relative z-[80] w-[80%] max-w-xs h-full shadow-lg transition-transform duration-200 ${
							isSidebarOpen ? "translate-x-0" : "-translate-x-full"
						}`}
					>
						{sidebarBody}
					</div>
					<button
						type='button'
						className={`flex-1 bg-black/40 transition-opacity duration-200 ${
							isSidebarOpen ? "opacity-100" : "opacity-0"
						}`}
						onClick={close}
						aria-label='Close conversations backdrop'
					/>
				</div>
			)}
		</>
	);
};
export default LeftPanel;
