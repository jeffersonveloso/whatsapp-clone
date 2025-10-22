import {IMessage, useConversationStore} from "@/store/chat-store";
import {useMutation} from "convex/react";
import {
    Ban,
    ChevronDown,
    Info,
    LogOut,
    MessageSquareDiff,
    Trash, TriangleAlert
} from "lucide-react";
import toast from "react-hot-toast";
import {api} from "../../../convex/_generated/api";
import React from "react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";

type ChatAvatarActionsProps = {
    message: IMessage;
    me: any;
};

const MessageOptionsMenu = ({me, message}: ChatAvatarActionsProps) => {
    const {selectedConversation, setSelectedConversation} = useConversationStore();

    const isMember = selectedConversation?.participants.includes(message.sender._id);
    const kickUser = useMutation(api.conversations.kickUser);
    const upsertConversation = useMutation(api.conversations.upsertConversation);
    const deleteMessage = useMutation(api.messages.deleteMessage);

    const fromAI = message.sender?.name === "ChatGPT";
    const isGroup = selectedConversation?.isGroup;

    const canDelete = isGroup ? selectedConversation?.admins?.includes(me._id) || message.sender._id === me._id : message.sender._id === me._id;

    const handleKickUser = async (e: React.MouseEvent) => {
        if (fromAI) return;
        e.stopPropagation();
        if (!selectedConversation) return;

        try {
            await kickUser({
                conversationId: selectedConversation._id,
                userId: message.sender._id,
            });

            setSelectedConversation({
                ...selectedConversation,
                participants: selectedConversation.participants.filter((id) => id !== message.sender._id),
            });
        } catch (error) {
            toast.error("Failed to kick user");
        }
    };

    const handleDeleteMessage = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedConversation) return;

        try {
            await deleteMessage({
                messageId: message._id,
            });
        } catch (error) {
            toast.error("Failed to kick user");
        }
    };

    const handleCreateConversation = async () => {
        if (fromAI) return;

        try {
            const conversationId = await upsertConversation({
                isGroup: false,
                participants: [me._id, message.sender._id],
            });

            setSelectedConversation({
                _id: conversationId,
                name: message.sender.name,
                participants: [me._id, message.sender._id],
                isGroup: false,
                isOnline: message.sender.isOnline,
                image: message.sender.image,
            });
        } catch (error) {
            toast.error("Failed to create conversation");
        }
    };

    return (
        <div
            className='text-[11px] flex gap-4 justify-between font-bold cursor-pointer group'
        >
            {isGroup && message.sender._id != me._id ? (<span>{message.sender.name}</span>) : <span> </span>}
            {!isMember && !fromAI && isGroup && <Ban size={16} className='text-red-500'/>}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="p-2 hover:bg-gray-200 rounded-full">
                        <ChevronDown size={15}/>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="min-w-[180px]">
                    <DropdownMenuItem onClick={handleKickUser} disabled={true}>
                        <TriangleAlert size={16} className="mr-2"/>
                        Actions
                    </DropdownMenuItem>

                    {isGroup && message.sender._id != me._id && (
                        <DropdownMenuItem onClick={handleCreateConversation}>
                            <MessageSquareDiff size={16} className="mr-2"/>
                            Private chat
                        </DropdownMenuItem>
                    )}
                    {canDelete && (
                        <DropdownMenuItem className="text-red-600" onClick={handleDeleteMessage}>
                            <Trash size={16} className="mr-2"/>
                            Delete message
                        </DropdownMenuItem>
                    )}
                    {isGroup && isMember && selectedConversation?.admins?.includes(me._id) && message.sender._id != me._id && (
                        <DropdownMenuItem className="text-red-600" onClick={handleKickUser}>
                            <LogOut size={16} className="mr-2"/>
                            Remove user
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
export default MessageOptionsMenu;
