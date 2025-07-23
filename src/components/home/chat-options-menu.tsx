import React from "react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "../ui/dropdown-menu";
import {
    MoreVertical,
    LogOut, Trash,
} from "lucide-react";
import {Id} from "../../../convex/_generated/dataModel";

interface ChatOptionsMenuProps {
    conversation: any;
    me: any;
    onArchive?: () => void;
    onToggleMute?: () => void;
    onTogglePin?: () => void;
    onMarkUnread?: () => void;
    onToggleFavorite?: () => void;
    onExitGroup: () => void;
    onDeleteConversation: () => void;
}

const ChatOptionsMenu: React.FC<ChatOptionsMenuProps> = ({
                                                             conversation,
                                                             me,
                                                             onExitGroup,
                                                             onDeleteConversation
                                                         }) => {

    return (<DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-gray-200 rounded-full">
                    <MoreVertical size={18}/>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="min-w-[180px]">
                {/*<DropdownMenuItem onClick={onArchive}>
                    <Archive size={16} className="mr-2"/>
                    Archive chat
                </DropdownMenuItem>

                <DropdownMenuItem onClick={onToggleMute}>
                    {conversation.isMuted ? (
                        <Bell size={16} className="mr-2"/>
                    ) : (
                        <BellOff size={16} className="mr-2"/>
                    )}
                    {conversation.isMuted ? "Unmute notifications" : "Mute notifications"}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={onTogglePin}>
                    <Pin size={16} className="mr-2"/>
                    {conversation.isPinned ? "Unpin chat" : "Pin chat"}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={onMarkUnread}>
                    <LayoutList size={16} className="mr-2"/>
                    {conversation.markAsRead ? "Mark as unread" : "Mark as read"}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={onToggleFavorite}>
                    <Star size={16} className="mr-2"/>
                    {conversation.isFavorite ? "Remove from favorites" : "Add to favorites"}
                </DropdownMenuItem>*/}
                {conversation.isGroup && !conversation.admins?.includes(me?._id as Id<"users">) && (
                    <DropdownMenuItem onClick={onExitGroup} className="text-red-600">
                        <LogOut size={16} className="mr-2"/>
                        Exit group
                    </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={onDeleteConversation} className="text-red-600">
                    <Trash size={16} className="mr-2"/>
                    Delete chat
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
};

export default ChatOptionsMenu;
