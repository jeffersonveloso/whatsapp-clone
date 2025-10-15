"use client";
import { ListFilter, X } from "lucide-react";
import ThemeSwitch from "./theme-switch";
import Conversation from "./conversation";
import { UserButton } from "@clerk/nextjs";

import UserListDialog from "./user-list-dialog";
import {useConvexAuth, useQuery} from "convex/react";
import { api } from "../../../convex/_generated/api";
import React, { useEffect } from "react";
import { useConversationStore } from "@/store/chat-store";
import SearchBar from "@/components/home/search-bar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSidebarStore } from "@/store/ui-store";

const LeftPanel = () => {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const conversations = useQuery(api.conversations.getMyConversations, isAuthenticated ? undefined : "skip");
	const { selectedConversation, setSelectedConversation } = useConversationStore();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const { isSidebarOpen, close } = useSidebarStore();

	useEffect(() => {
		const conversationIds = conversations?.map((conversation) => conversation._id);
		if (selectedConversation && conversationIds && !conversationIds.includes(selectedConversation._id)) {
			setSelectedConversation(null);
		}
	}, [conversations, selectedConversation, setSelectedConversation]);

	useEffect(() => {
		if (isDesktop) {
			close();
		}
	}, [isDesktop, close]);

	if (isLoading) return null;

	const handleConversationSelect = (conversation: any) => {
		setSelectedConversation(conversation);
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

			{!isDesktop && isSidebarOpen ? (
				<div className='fixed inset-0 z-[70] flex md:hidden'>
					<div className='relative z-[80] w-[80%] max-w-xs h-full shadow-lg'>{sidebarBody}</div>
					<button
						type='button'
						className='flex-1 bg-black/40'
						onClick={close}
						aria-label='Close conversations backdrop'
					/>
				</div>
			) : null}
		</>
	);
};
export default LeftPanel;
