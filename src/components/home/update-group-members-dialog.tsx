import React, { useRef, useState } from "react";
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
import {useMutation, usePaginatedQuery, useQuery} from "convex/react";
import { api } from "../../../convex/_generated/api";
import toast from "react-hot-toast";
import {Conversation, useConversationStore} from "@/store/chat-store";
import useDebounce from "@/hooks/useDebouce";
import SearchBar from "@/components/home/search-bar";

type UpdateGroupMembersDialogProps = {
	selectedConversation: Conversation;
};
const PAGE_SIZE = 30;

const UpdateGroupMembersDialog = ({ selectedConversation }: UpdateGroupMembersDialogProps) => {
	const members = useQuery(api.users.getGroupMembers, { conversationId: selectedConversation._id });

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
		{search: searchText}, // Any additional arguments for your query, e.g., { category: "books" }
		{ initialNumItems: PAGE_SIZE } // Initial number of items to load
	);

	// Achata todas as páginas em um array só
	let users = results?.flatMap((p) => p) ?? [];

	if(users && members) {
		users = users.filter((entry) => !members.find((row) => row._id === entry._id));
	}

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
			<DialogTrigger>
				<p className='text-xs text-muted-foreground text-left flex items-center space-x-1'>Add members <MessageSquareDiff size={16}/></p>
			</DialogTrigger>
			<DialogContent className="w-full !max-w-[90vw] sm:!max-w-4xl p-2">
					<div className="flex max-h-[80vh] flex-col gap-4 overflow-hidden">
						<DialogHeader>
							{/* TODO: <DialogClose /> will be here */}
							<DialogClose ref={dialogCloseRef} />
							<DialogTitle>Users</DialogTitle>
							<DialogDescription>Add new members to the group</DialogDescription>
						</DialogHeader>

						{/* Search */}
						<div className="px-3">
							<SearchBar
								placeholder="Search users…"
								filterText={searchParam}
								onFilterTextChange={handleSearchChange}
								className="relative h-10 mx-3 flex-1"
							/>
						</div>
						<div
							className='flex flex-col gap-3 border-2 rounded-md bg-gray-100 max-h-60 overflow-auto'
							onScroll={handleScroll}
						>
							{users?.map((user) => (
								<div
									key={user._id}
									className={`flex gap-3 items-center p-2 rounded cursor-pointer active:scale-95 
										transition-all ease-in-out duration-300
									${selectedUsers.includes(user._id) ? "bg-green-primary" : ""}`}
									onClick={() => {
										if (selectedUsers.includes(user._id)) {
											setSelectedUsers(selectedUsers.filter((id) => id !== user._id));
										} else {
											setSelectedUsers([...selectedUsers, user._id]);
										}
									}}
								>
									<Avatar className='overflow-visible'>
										{user.isOnline && (
											<div className='absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-foreground' />
										)}

										<AvatarImage src={user.image} className='rounded-full object-cover' />
										<AvatarFallback>
											<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
										</AvatarFallback>
									</Avatar>

									<div className='w-full '>
										<div className='flex items-center justify-between'>
											<p className='text-md font-medium'>{user.name || user?.email?.split("@")[0]}</p>
										</div>
									</div>
								</div>
							))}
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
