import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MessageSeenSvg } from "@/lib/svgs";
import { FileText, ImageIcon, Mic, Users, VideoIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConversationStore } from "@/store/chat-store";
import ChatOptionsMenu from "@/components/home/chat-options-menu";
import { MessageType } from "../../../types/messages";

type ConversationProps = {
	conversation: any;
	onSelect?: () => void;
};

const Conversation = ({
	conversation,
	onSelect,
}: ConversationProps) => {
	const conversationImage = conversation.groupImage || conversation.image;
	const conversationName = conversation.groupName || conversation.name;
	const lastMessage = conversation.lastMessage;
	const lastMessageType = lastMessage?.messageType;
	const me = useQuery(api.users.getMe);
	const sentByMe = me?._id ? lastMessage?.sender === me._id : false;

	const { setSelectedConversation, selectedConversation } = useConversationStore();
	const activeBgClass = selectedConversation?._id === conversation._id;

	return (
		<>
			<div
				className={`flex gap-2 items-center p-3 hover:bg-chat-hover cursor-pointer
					${activeBgClass ? "bg-gray-tertiary" : ""}
				`}
				onClick={(event) => {
					const trigger = (event.target as HTMLElement)?.closest("[data-chat-options-trigger]");
					if (trigger) return;
					setSelectedConversation(conversation);
					onSelect?.();
				}}
			>
				<Avatar className='border border-gray-900 overflow-visible relative'>
					{conversation.isOnline && (
						<div className='absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-foreground' />
					)}
					<AvatarImage src={conversationImage || "/placeholder.png"} className='object-cover rounded-full' />
					<AvatarFallback>
						<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
					</AvatarFallback>
				</Avatar>
				<div className='w-full'>
					<div className='flex items-center'>
						<h3 className='text-sm font-medium'>{conversationName}</h3>
						<span className='text-xs text-gray-500 ml-auto'>
							{formatDate(lastMessage?._creationTime || conversation._creationTime)}
						</span>
					</div>
				<p className='text-[12px] mt-1 text-gray-500 flex items-center gap-1 '>
					{sentByMe ? <MessageSeenSvg /> : null}
						{conversation.isGroup && <Users size={16} />}
						{!lastMessage && "Say Hi!"}
						{lastMessageType === MessageType.textMessage && lastMessage?.textMessage?.content && (
							<span>
								{lastMessage.textMessage.content.length > 30
									? `${lastMessage.textMessage.content.slice(0, 30)}...`
									: lastMessage.textMessage.content}
							</span>
						)}
						{lastMessageType === MessageType.imageMessage && <ImageIcon size={16} />}
						{lastMessageType === MessageType.videoMessage && <VideoIcon size={16} />}
						{lastMessageType === MessageType.audioMessage && <Mic size={16} />}
						{lastMessageType === MessageType.documentMessage && <FileText size={16} />}
					</p>
				</div>
				<ChatOptionsMenu
					conversation={conversation}
					me={me}
				/>
			</div>
			<hr className='h-[1px] mx-10 bg-gray-primary' />
		</>
	);
};
export default Conversation;
