import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {Crown, LogOut} from "lucide-react";
import {Conversation, useConversationStore} from "@/store/chat-store";
import {useMutation, useQuery} from "convex/react";
import { api } from "../../../convex/_generated/api";
import UpdateGroupMembersDialog from "@/components/home/update-group-members-dialog";
import React from "react";
import toast from "react-hot-toast";
import {Id} from "../../../convex/_generated/dataModel";

type GroupMembersDialogProps = {
	selectedConversation: Conversation;
};

const GroupMembersDialog = ({ selectedConversation }: GroupMembersDialogProps) => {
	const me = useQuery(api.users.getMe);
	const users = useQuery(api.users.getGroupMembers, { conversationId: selectedConversation._id });

	const kickUser = useMutation(api.conversations.kickUser);
	const { setSelectedConversation } = useConversationStore();

	const handleKickUser = async (e: React.MouseEvent, userId: Id<"users">) => {
		e.stopPropagation();
		if (!selectedConversation) return;
		try {
			await kickUser({
				conversationId: selectedConversation._id,
				userId: userId,
			});

			setSelectedConversation({
				...selectedConversation,
				participants: selectedConversation.participants.filter((id) => id !== userId),
			});
		} catch (error) {
			toast.error("Failed to kick user");
		}
	};

	return (
		<Dialog>
			<DialogTrigger>
				<p className='text-xs text-muted-foreground text-left'>See members</p>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className='my-2'>Current Members</DialogTitle>
					<DialogDescription asChild>
						<div className='flex flex-col gap-3 '>
							<UpdateGroupMembersDialog selectedConversation={selectedConversation}/>

							{users?.map((user) => (
								<div key={user._id} className={`flex gap-3 items-center p-2 rounded`}>
									<Avatar className='overflow-visible'>
										{user.isOnline && (
											<div className='absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-foreground' />
										)}
										<AvatarImage src={user.image} className='rounded-full object-cover' />
										<AvatarFallback>
											<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
										</AvatarFallback>
									</Avatar>

									<div className='w-full '>
										<div className='flex items-center gap-2'>
											<h3 className='text-md font-medium'>
												{/* johndoe@gmail.com */}
												{user.name || user?.email?.split("@")[0]}
											</h3>
											{selectedConversation?.admin === me?._id && user._id != me?._id && (
												<LogOut size={16} className='text-red-500' onClick={(e) => handleKickUser(e, user._id)} />
											)}
											{user._id === selectedConversation.admin && (
												<Crown size={16} className='text-yellow-400' />
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
};
export default GroupMembersDialog;
