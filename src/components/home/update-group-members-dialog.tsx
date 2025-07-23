import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ImageIcon, MessageSquareDiff } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import toast from "react-hot-toast";
import {Conversation, useConversationStore} from "@/store/chat-store";
import {addConversationParticipants} from "../../../convex/conversations";

type UpdateGroupMembersDialogProps = {
	selectedConversation: Conversation;
};

const UpdateGroupMembersDialog = ({ selectedConversation }: UpdateGroupMembersDialogProps) => {
	const members = useQuery(api.users.getGroupMembers, { conversationId: selectedConversation._id });

	const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const dialogCloseRef = useRef<HTMLButtonElement>(null);
	const addConversationParticipants = useMutation(api.conversations.addConversationParticipants);

	let users = useQuery(api.users.getUsers);
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

	return (
		<Dialog>
			<DialogTrigger>
				<p className='text-xs text-muted-foreground text-left flex items-center space-x-1'>Add members <MessageSquareDiff size={16}/></p>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					{/* TODO: <DialogClose /> will be here */}
					<DialogClose ref={dialogCloseRef} />
					<DialogTitle>Users</DialogTitle>
				</DialogHeader>

				<DialogDescription>Add new members to the group</DialogDescription>
				<div className='flex flex-col gap-3 overflow-auto max-h-60'>
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
				<div className='flex justify-between'>
					<Button variant={"outline"} onClick={() => dialogCloseRef.current?.click()}>Cancel</Button>
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
			</DialogContent>
		</Dialog>
	);
};
export default UpdateGroupMembersDialog;
