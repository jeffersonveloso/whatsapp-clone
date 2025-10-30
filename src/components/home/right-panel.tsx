"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X } from "lucide-react";
import MessageInput from "./message-input";
import MessageContainer from "./message-container";
import ChatPlaceHolder from "@/components/home/chat-placeholder";
import GroupMembersDialog from "./group-members-dialog";
import { useConversationStore } from "@/store/chat-store";
import {useConvexAuth} from "convex/react";
import { useSidebarStore } from "@/store/ui-store";
import {useRouter} from "next/navigation";
import { Button } from "../ui/button";

const RightPanel = () => {
    const { selectedConversation, setSelectedConversation } = useConversationStore();
    const {isLoading } = useConvexAuth();
    const { toggle: toggleSidebar, close: closeSidebar } = useSidebarStore();
    const router = useRouter();

	if (isLoading) return null;
	if (!selectedConversation) return <ChatPlaceHolder onOpenSidebar={toggleSidebar} />;

	const conversationName = selectedConversation.groupName || selectedConversation.name;
	const conversationImage = selectedConversation.groupImage || selectedConversation.image;

	return (
		<div className='flex flex-1 min-h-0 w-full flex-col'>
			<div className='sticky top-0 z-50 bg-gray-primary'>
				{/* Header */}
				<div className='flex justify-between p-3'>
					<div className='flex gap-3 items-center'>
						<button
							type='button'
							className='md:hidden text-muted-foreground hover:text-foreground transition'
							onClick={toggleSidebar}
							aria-label='Open conversations menu'
						>
							<Menu size={20} />
						</button>
						<Avatar>
							<AvatarImage src={conversationImage || "/placeholder.png"} className='object-cover' />
							<AvatarFallback>
								<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full' />
							</AvatarFallback>
						</Avatar>
						<div className='flex flex-col'>
							<p>{conversationName}</p>
							{selectedConversation.isGroup && (
								<GroupMembersDialog selectedConversation={selectedConversation} />
							)}
						</div>
					</div>

					<div className='flex items-center gap-7 mr-5'>
						{/*<a href='/video-call' target='_blank'>
							<Video size={23} />
						</a>*/}
						 <Button
                            size={"sm"}
                            variant={"default"} 
							onClick={() => {
								setSelectedConversation(null);
								closeSidebar();
								router.replace("/", {scroll: false});
							}}
                        >
                            <X/>
                        </Button>
						
					</div>
				</div>
			</div>
			{/* CHAT MESSAGES */}
			<MessageContainer />

			{/* INPUT */}
			<MessageInput />
		</div>
	);
};
export default RightPanel;
