import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConversationStore } from "@/store/chat-store";
import toast from "react-hot-toast";

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "../ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

import {
    LogOut,
    Trash, ChevronDown,
} from "lucide-react";

interface ChatOptionsMenuProps {
    conversation: any;
    me: any;
}

const ChatOptionsMenu: React.FC<ChatOptionsMenuProps> = ({
                                                             conversation,
                                                             me,
                                                         }) => {
    const exitGroup = useMutation(api.conversations.kickUser);
    const deleteConversation = useMutation(api.conversations.deleteConversation);
    const { setSelectedConversation } = useConversationStore();

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const canDelete = !conversation.isGroup
        ? conversation.participants?.includes(me._id)
        : conversation.admins?.includes(me._id);

    const handleExitGroup = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await exitGroup({
                conversationId: conversation._id,
                userId: me._id,
            });
        } catch {
            toast.error("Failed to exit group");
        }
    };

    const handleDeleteConversation = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteConversation({ conversationId: conversation._id });
            setSelectedConversation(null);
            setIsConfirmOpen(false);
        } catch {
            toast.error("Failed to delete chat");
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="p-2 hover:bg-gray-200 rounded-full"
                        data-chat-options-trigger
                    >
                        <ChevronDown size={15}/>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side="right"
                    align="end"
                    className="z-[90] min-w-[180px]"
                >
                    {conversation.isGroup &&
                        !conversation.admins?.includes(me._id) && (
                            <DropdownMenuItem
                                onClick={handleExitGroup}
                                className="text-red-600"
                            >
                                <LogOut size={16} className="mr-2" />
                                Exit group
                            </DropdownMenuItem>
                        )}
                    {canDelete && (
                        <DropdownMenuItem
                            onClick={handleDeleteConversation}
                            className="text-red-600"
                        >
                            <Trash size={16} className="mr-2" />
                            {conversation.isGroup
                                ? "Delete group"
                                : "Delete chat"}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* === Modal de confirmação === */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {conversation.isGroup
                                ? "Delete grupo"
                                : "Delete chat"}
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this{" "}
                            {conversation.isGroup ? "group" : "chat"}?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ChatOptionsMenu;
