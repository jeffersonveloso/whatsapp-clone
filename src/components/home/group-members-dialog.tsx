import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Avatar, AvatarFallback, AvatarImage} from "../ui/avatar";
import {Crown, EllipsisVertical, LogOut, MessageSquareDiff, TriangleAlert} from "lucide-react";
import {Conversation, IMessage, useConversationStore} from "@/store/chat-store";
import {useMutation, useQuery} from "convex/react";
import {api} from "../../../convex/_generated/api";
import UpdateGroupMembersDialog from "@/components/home/update-group-members-dialog";
import React, {useMemo, useState, useEffect} from "react";
import toast from "react-hot-toast";
import {Id} from "../../../convex/_generated/dataModel";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SearchBar from "@/components/home/search-bar";
import useDebounce from "@/hooks/useDebouce";

type GroupMembersDialogProps = {
    selectedConversation: Conversation;
};

const GroupMembersDialog = ({selectedConversation}: GroupMembersDialogProps) => {
    const me = useQuery(api.users.getMe);
    const users = useQuery(api.users.getGroupMembers, {conversationId: selectedConversation._id});
    const [searchParam, setSearchParam] = useState("");

    // debounce com 1000ms de espera
    const searchText = useDebounce(searchParam, 1000);

    const kickUser = useMutation(api.conversations.kickUser);
    const upsertConversation = useMutation(api.conversations.upsertConversation);
    const {setSelectedConversation} = useConversationStore();

    const itemsPerPage = 5;
    const [currentPage, setCurrentPage] = useState(1);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        const search = searchText.trim().toLowerCase();
        if (!search) return users;
        return users.filter((user) => {
            const name = user.name?.toLowerCase() ?? "";
            const email = user.email?.toLowerCase() ?? "";
            return name.includes(search) || email.includes(search);
        });
    }, [users, searchText]);

    const totalPages = Math.ceil((users?.length || 0) / itemsPerPage);

    const displayedUsers = useMemo(() => {
        const end = currentPage * itemsPerPage;
        return filteredUsers.slice(0, end);
    }, [filteredUsers, currentPage]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
            setCurrentPage((prev) =>
                prev < totalPages ? prev + 1 : prev
            );
        }
    };

    // --- Handlers de ação (kick/promote) mantidos iguais ---
    const handleKickUser = async (e: React.MouseEvent, userId: Id<"users">): Promise<void> => {
        e.stopPropagation();
        if (!selectedConversation) return;
        try {
            await kickUser({conversationId: selectedConversation._id, userId});
            setSelectedConversation({
                ...selectedConversation,
                participants: selectedConversation.participants.filter((id) => id !== userId),
            });
            if (selectedConversation?.admins?.includes(userId)) {
                await handleNewAdmins(e, userId, false);
            }
        } catch {
            toast.error("Failed to kick user");
        }
    };

    const handleNewAdmins = async (
        e: React.MouseEvent,
        userId: Id<"users">,
        promote: boolean
    ): Promise<void> => {
        e.stopPropagation();
        if (!selectedConversation) return;
        const newAdmins = promote
            ? [...new Set([...selectedConversation.admins ?? [], userId])]
            : selectedConversation?.admins?.filter((id) => id !== userId);
        try {
            await upsertConversation({
                _id: selectedConversation._id,
                isGroup: true,
                groupName: selectedConversation.groupName,
                admins: newAdmins,
                participants: selectedConversation.participants,
            });
            setSelectedConversation({...selectedConversation, admins: newAdmins});
        } catch {
            toast.error(`Failed to ${promote ? "promote" : "dismiss"} user as admin`);
        }
    };

    const handleCreateConversation = async (e: React.MouseEvent, user: any) => {
        try {
            e.stopPropagation();
            if (!selectedConversation) return;

            const conversationId = await upsertConversation({
                isGroup: false,
                participants: [me._id, user._id],
            });

            setSelectedConversation({
                _id: conversationId,
                name: user.name,
                participants: [me._id, user._id],
                isGroup: false,
                isOnline: user.isOnline,
                image: user.image,
            });
        } catch (error) {
            console.log(error);
            toast.error("Failed to create conversation");
        }
    };

    // handler do input
    const handleSearchChange = (value: string) => {
        setSearchParam(value);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchText]);

    return (
        <Dialog>
            <DialogTrigger>
                <p className="text-xs text-muted-foreground text-left">See members</p>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="my-2">Current Members</DialogTitle>
                    <DialogDescription asChild>
                        <div>
                            {selectedConversation?.admins?.includes(me?._id as Id<"users">) && (
                                <div className="flex flex-col gap-3 items-end py-3">
                                    <UpdateGroupMembersDialog selectedConversation={selectedConversation}/>
                                </div>
                            )}

                            {/* Search */}
                            <div className="px-3">
                                <SearchBar
                                    placeholder="Search members…"
                                    filterText={searchParam}
                                    onFilterTextChange={handleSearchChange}
                                    className="relative h-10 mx-3 flex-1"
                                />
                            </div>

                            <div
                                className="flex flex-col gap-3 overflow-auto max-h-60 border-2 rounded-md bg-gray-100"
                                onScroll={handleScroll}
                            >
                                {displayedUsers.map((user) => (
                                    <div key={user._id} className="flex gap-3 items-center p-2 border-b-2 rounded">
                                        <Avatar className="overflow-visible">
                                            {user.isOnline && (
                                                <div
                                                    className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-foreground"/>
                                            )}
                                            <AvatarImage src={user.image} className="rounded-full object-cover"/>
                                            <AvatarFallback>
                                                <div
                                                    className="animate-pulse bg-gray-tertiary w-full h-full rounded-full"/>
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="w-full ">
                                            <div className="flex items-center gap-5">
                                                <h3 className="text-md font-medium">
                                                    {user.name || user?.email?.split("@")[0]}
                                                </h3>
                                                {selectedConversation?.admins?.includes(user._id) && (
                                                    <Crown size={16} className="text-yellow-500"/>
                                                )}
                                            </div>
                                        </div>

                                        {selectedConversation?.admins?.includes(me?._id as Id<"users">) &&
                                            user._id !== me?._id ? (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-2 hover:bg-gray-200 rounded-full">
                                                            <EllipsisVertical size={15}/>
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        side="right"
                                                        align="end"
                                                        className="min-w-[180px]"
                                                    >
                                                        <DropdownMenuItem disabled>
                                                            <TriangleAlert size={16} className="mr-2"/>
                                                            Actions
                                                        </DropdownMenuItem>
                                                         <DropdownMenuSeparator/>
                                                         <DropdownMenuItem
                                                            onClick={(e) => handleCreateConversation(e, user)}
                                                        >
                                                            <MessageSquareDiff size={16} className="mr-2"/>Private chat
                                                        
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator/>
                                                        <DropdownMenuItem
                                                            onClick={(e) =>
                                                                handleNewAdmins(
                                                                    e,
                                                                    user._id,
                                                                    !selectedConversation?.admins?.includes(user._id)
                                                                )
                                                            }
                                                            className={
                                                                selectedConversation?.admins?.includes(user._id)
                                                                    ? "text-red-500"
                                                                    : ""
                                                            }
                                                        >
                                                            {!selectedConversation?.admins?.includes(user._id)
                                                                ? (
                                                                    <>
                                                                        Promote to admin{" "}
                                                                        <Crown size={16} className="text-yellow-500"/>
                                                                    </>
                                                                )
                                                                : "Dismiss as admin"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator/>
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={(e) => handleKickUser(e, user._id)}
                                                        >
                                                            <LogOut size={16}/> Remove user
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            ):  (<DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-2 hover:bg-gray-200 rounded-full">
                                                            <EllipsisVertical size={15}/>
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        side="right"
                                                        align="end"
                                                        className="min-w-[180px]"
                                                    >
                                                        <DropdownMenuItem disabled>
                                                            <TriangleAlert size={16} className="mr-2"/>
                                                            Actions
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator/>
                                                        <DropdownMenuItem
                                                            onClick={(e) => handleCreateConversation(e, user)}
                                                        >
                                                            <MessageSquareDiff size={16} className="mr-2"/>Private chat
                                                        
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>)}
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
