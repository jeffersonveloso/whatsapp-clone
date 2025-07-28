import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Avatar, AvatarFallback, AvatarImage} from "../ui/avatar";
import {Crown, EllipsisVertical, LogOut, Menu, TriangleAlert} from "lucide-react";
import {Conversation, useConversationStore} from "@/store/chat-store";
import {useMutation, useQuery} from "convex/react";
import {api} from "../../../convex/_generated/api";
import UpdateGroupMembersDialog from "@/components/home/update-group-members-dialog";
import React from "react";
import toast from "react-hot-toast";
import {Id} from "../../../convex/_generated/dataModel";
import {Button} from "@/components/ui/button";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type GroupMembersDialogProps = {
    selectedConversation: Conversation;
};

const GroupMembersDialog = ({selectedConversation}: GroupMembersDialogProps) => {
    const me = useQuery(api.users.getMe);
    const users = useQuery(api.users.getGroupMembers, {conversationId: selectedConversation._id});

    const kickUser = useMutation(api.conversations.kickUser);
    const upsertConversation = useMutation(api.conversations.upsertConversation);

    const {setSelectedConversation} = useConversationStore();

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

    const handleNewAdmins = async (e: React.MouseEvent, userId: Id<"users">, promote: boolean) => {
        e.stopPropagation();
        if (!selectedConversation) return;
        try {
            await upsertConversation({
                _id: selectedConversation._id,
                isGroup: true,
                groupName: selectedConversation.groupName,
                admins: promote ? [...new Set(selectedConversation.admins), userId] : selectedConversation.admins?.filter((id) => id !== userId),
                participants: selectedConversation.participants
            });

            setSelectedConversation({
                ...selectedConversation,
                admins: promote ? [...new Set(selectedConversation.admins), userId] : selectedConversation.admins?.filter((id) => id !== userId),
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
                        <div>
                            {selectedConversation?.admins?.includes(me?._id as Id<"users">) &&
                                (<div className='flex flex-col gap-3 items-end py-3'>
                                        <UpdateGroupMembersDialog selectedConversation={selectedConversation}/>
                                    </div>
                                )}

                            <div className='flex flex-col gap-3 overflow-auto max-h-60 border-2 rounded-md bg-gray-100'>
                                {users?.map((user) => (
                                    <div key={user._id} className={`flex gap-3 items-center p-2 border-b-2 rounded`}>
                                        <Avatar className='overflow-visible'>
                                            {user.isOnline && (
                                                <div
                                                    className='absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-foreground'/>
                                            )}
                                            <AvatarImage src={user.image} className='rounded-full object-cover'/>
                                            <AvatarFallback>
                                                <div
                                                    className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className='w-full '>
                                            <div className='flex items-center gap-5'>
                                                <h3 className='text-md font-medium'>
                                                    {/* johndoe@gmail.com */}
                                                    {user.name || user?.email?.split("@")[0]}
                                                </h3>
                                                {selectedConversation?.admins?.includes(user._id) && (
                                                    <Crown size={16} className='text-yellow-500'/>
                                                )}
                                            </div>
                                        </div>

                                        {selectedConversation?.admins?.includes(me?._id as Id<"users">) && user._id != me?._id && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-2 hover:bg-gray-200 rounded-full">
                                                        <EllipsisVertical size={15}/>
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent side="right" align="end" className="min-w-[180px]">
                                                    <DropdownMenuItem disabled={true}>
                                                        <TriangleAlert size={16} className="mr-2"/>
                                                        Actions
                                                    </DropdownMenuItem>
                                                    {selectedConversation?.admins?.includes(me?._id as Id<"users">) && user._id != me?._id && (
                                                        <>
                                                            <DropdownMenuSeparator/>
                                                            <DropdownMenuItem
                                                                className='text-red-600'
                                                                onClick={(e) => handleKickUser(e, user._id)}>
                                                                <LogOut size={16}/> Remove user
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {selectedConversation?.admins?.includes(me?._id as Id<"users">) && user._id != me?._id && (
                                                        <>
                                                            <DropdownMenuSeparator/>
                                                            <DropdownMenuItem
                                                                onClick={(e) => handleNewAdmins(e, user._id, !selectedConversation?.admins?.includes(user._id))}
                                                                className={selectedConversation?.admins?.includes(user._id) ? 'text-red-500' : ''}
                                                            >
                                                                {!selectedConversation?.admins?.includes(user._id) ?
                                                                    (<> Promote to admin <Crown size={16} className='text-yellow-500'/> </>) :
                                                                    "Dismiss as admin"
                                                                }
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
};
export default GroupMembersDialog;
