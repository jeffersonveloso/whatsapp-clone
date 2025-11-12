import React, { ReactNode, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import {  MessageSquareDiff } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import {useMutation, usePaginatedQuery} from "convex/react";
import { api } from "../../../convex/_generated/api";
import toast from "react-hot-toast";
import {Conversation, useConversationStore} from "@/store/chat-store";
import useDebounce from "@/hooks/useDebouce";
import SearchBar from "@/components/home/search-bar";

type UpdateGroupMembersDialogProps = {
	selectedConversation: Conversation;
	trigger?: ReactNode;
};
const PAGE_SIZE = 30;

const UpdateGroupMembersDialog = ({ selectedConversation, trigger }: UpdateGroupMembersDialogProps) => {
	const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchParam, setSearchParam] = useState("");

	// debounce com 1000ms de espera
	const searchText = useDebounce(searchParam, 1000);

	const dialogCloseRef = useRef<HTMLButtonElement>(null);
	const addConversationParticipants = useMutation(api.conversations.addConversationParticipants);

	// pesquisa e infinite query
	const { results, status, loadMore } = usePaginatedQuery(
		api.users.pagedUsers, // Your paginated query function
		{search: searchText, conversationId: selectedConversation._id}, // Any additional arguments for your query, e.g., { category: "books" }
		{ initialNumItems: PAGE_SIZE } // Initial number of items to load
	);

	// Achata todas as páginas em um array só
	const users = results?.flatMap((p) => p) ?? [];

	const { setSelectedConversation } = useConversationStore();

	const handleUpdateGroup = async () => {
		if (!selectedConversation) return;
		setIsLoading(true);
		try {
			dialogCloseRef.current?.click();
			setSelectedUsers([]);
			await addConversationParticipants({
				_id: selectedConversation._id,
				participants: [...new Set(selectedConversation.participants.concat(selectedUsers))],
			});

			setSelectedConversation({
				...selectedConversation,
				participants: [...new Set(selectedConversation.participants.concat(selectedUsers))],
			});
		} catch (err) {
			toast.error("Failed to add members to the group.");
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	// handler do input
	const handleSearchChange = (value: string) => {
		setSearchParam(value);
	};

	// infinite scroll usando status e loadMore
	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const el = e.currentTarget;
		if (
			el.scrollHeight - el.scrollTop <= el.clientHeight + 50 &&
			status === "CanLoadMore"
		) {
			loadMore(PAGE_SIZE);
		}
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				{trigger ?? (
					<p className='text-xs text-muted-foreground text-left flex items-center space-x-1'>
						Add members <MessageSquareDiff size={16} />
					</p>
				)}
			</DialogTrigger>
			<DialogContent className="w-full !max-w-[96vw] sm:!max-w-5xl p-0 border border-border bg-background text-foreground rounded-2xl shadow-2xl z-[130]">
					<div className="flex max-h-[85vh] flex-col gap-5 overflow-hidden p-6 bg-card">
						<DialogHeader className='relative pb-2 text-center'>
							<DialogClose ref={dialogCloseRef} className='absolute right-0 top-0' />
							<div className='flex flex-col items-center gap-3'>
								<Avatar className='h-16 w-16'>
									<AvatarImage
										src={selectedConversation.groupImage || selectedConversation.image || "/placeholder.png"}
										className='object-cover'
									/>
									<AvatarFallback>
										<div className='h-full w-full rounded-full bg-gray-tertiary' />
									</AvatarFallback>
								</Avatar>
								<div>
									<DialogTitle className='text-lg text-center'>
										{selectedConversation.groupName || "Add members"}
									</DialogTitle>
									<DialogDescription>
										Add new members to the group
									</DialogDescription>
								</div>
							</div>
						</DialogHeader>

						<div className='flex flex-col gap-4 rounded-xl border border-border/60 bg-background/60 p-4 shadow-inner'>
							<div className='flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground'>
								<p>
									Select users to add to the group..{" "}
									<span className='font-semibold text-foreground'>
										{selectedUsers.length} selecionado(s)
									</span>
								</p>
								{selectedUsers.length > 0 && (
									<Button variant='ghost' size='sm' onClick={() => setSelectedUsers([])}>
										Clear selection
									</Button>
								)}
							</div>
							<SearchBar
								placeholder="Search users…"
								filterText={searchParam}
								onFilterTextChange={handleSearchChange}
							/>
						</div>
						<div className='flex-1 overflow-hidden'>
							<div
								className='h-full space-y-3 overflow-y-auto rounded-2xl border border-border/80 bg-muted/60 dark:bg-muted/20 p-3 shadow'
								onScroll={handleScroll}
							>
								{users?.length === 0 && (
									<p className='py-10 text-center text-sm text-muted-foreground'>
										Nenhum usuário encontrado.
									</p>
								)}
								{users?.map((user) => (
									<div
										key={user._id}
										className={`flex gap-3 items-center rounded-xl border border-border/50 bg-card p-3 transition hover:border-border hover:bg-card/80 dark:bg-gray-900/60 ${selectedUsers.includes(user._id) ? "ring-2 ring-emerald-500" : ""}`}
										onClick={() => {
											if (selectedUsers.includes(user._id)) {
												setSelectedUsers(selectedUsers.filter((id) => id !== user._id));
											} else {
												setSelectedUsers([...selectedUsers, user._id]);
											}
										}}
										role='button'
										tabIndex={0}
									>
										<Avatar className='overflow-visible'>
											{user.isOnline && (
												<div className='absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full' />
											)}

											<AvatarImage src={user.image} className='rounded-full object-cover' />
											<AvatarFallback>
												<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
											</AvatarFallback>
										</Avatar>

										<div className='flex w-full items-center justify-between'>
											<div>
												<h3 className='text-md font-medium'>{user.name || user?.email?.split("@")[0]}</h3>
												<p className='text-xs text-muted-foreground'>{user.email}</p>
											</div>
											{selectedUsers.includes(user._id) && (
												<span className='text-xs font-semibold text-emerald-500'>Selected</span>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
						<div className='flex justify-end gap-5'>
							<div className="mr-5">
								<Button variant={"destructive"} onClick={() => dialogCloseRef.current?.click()}>Cancel</Button>
							</div>
							<div>
								<Button
									onClick={handleUpdateGroup}
									disabled={selectedUsers.length === 0 || (selectedUsers.length > 1 && !selectedConversation.groupName) || isLoading}
								>
									{/* spinner */}
									{isLoading ? (
										<div className='w-5 h-5 border-t-2 border-b-2  rounded-full animate-spin' />
									) : (
										"Add"
									)}
								</Button>
							</div>
						</div>
					</div>
			</DialogContent>
		</Dialog>
	);
};
export default UpdateGroupMembersDialog;
