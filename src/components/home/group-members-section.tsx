import React, { useEffect, useMemo, useState } from "react";
import { useConversationStore } from "@/store/chat-store";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Crown, LogOut, MessageSquareDiff, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Id } from "../../../convex/_generated/dataModel";
import toast from "react-hot-toast";
import SearchBar from "@/components/home/search-bar";
import useDebounce from "@/hooks/useDebouce";
import { Conversation } from "@/store/chat-store";

type GroupMembersSectionProps = {
	conversation: Conversation;
	onAddMembers?: React.ReactNode;
	isOpen?: boolean;
	className?: string;
};

const ITEMS_PER_PAGE = 6;

const GroupMembersSection = ({
	conversation,
	onAddMembers,
	isOpen = true,
	className,
}: GroupMembersSectionProps) => {
	const me = useQuery(api.users.getMe);
	const members = useQuery(
		api.users.getGroupMembers,
		isOpen ? { conversationId: conversation._id } : "skip",
	);

	const { setSelectedConversation } = useConversationStore();

	const kickUser = useMutation(api.conversations.kickUser);
	const upsertConversation = useMutation(api.conversations.upsertConversation);
	const updateAdmins = useMutation(api.conversations.updateAdmins);

	const [searchParam, setSearchParam] = useState("");
	const [page, setPage] = useState(1);
	const debouncedSearch = useDebounce(searchParam, 400);
	const [openMenuUser, setOpenMenuUser] = useState<Id<"users"> | null>(null);

	const isMeAdmin = !!(me?._id && conversation.admins?.includes(me._id));

	useEffect(() => {
		setPage(1);
	}, [debouncedSearch, conversation._id]);

	const filteredMembers = useMemo(() => {
		if (!members) return [];
		const term = debouncedSearch.trim().toLowerCase();
		if (!term) return members;
		return members.filter((member) => {
			const name = member.name?.toLowerCase() ?? "";
			const email = member.email?.toLowerCase() ?? "";
			return name.includes(term) || email.includes(term);
		});
	}, [members, debouncedSearch]);

	const displayedMembers = useMemo(() => {
		return filteredMembers.slice(0, page * ITEMS_PER_PAGE);
	}, [filteredMembers, page]);

	const canLoadMore = displayedMembers.length < filteredMembers.length;

	const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
		const el = event.currentTarget;
		if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50 && canLoadMore) {
			setPage((prev) => prev + 1);
		}
	};

	const handleKickUser = async (userId: Id<"users">) => {
		if (!isMeAdmin) return;
		try {
			await kickUser({ conversationId: conversation._id, userId });
			setSelectedConversation({
				...conversation,
				participants: conversation.participants.filter((id) => id !== userId),
				admins: conversation.admins?.filter((id) => id !== userId),
			});
			toast.success("User removed from the group.");
		} catch {
			toast.error("The user could not be removed.");
		}
	};

	const handleToggleAdmin = async (userId: Id<"users">, promote: boolean) => {
		if (!isMeAdmin) return;

		const newAdmins = promote
			? [...new Set([...(conversation.admins ?? []), userId])]
			: conversation.admins?.filter((id) => id !== userId) ?? [];

		try {
			await updateAdmins({
				conversationId: conversation._id,
				admins: newAdmins,
			});

			setSelectedConversation({
				...conversation,
				admins: newAdmins,
			});

			toast.success(promote ? "User removed" : "Admin removed.");
		} catch {
			toast.error("Failer to update admins list.");
		}
	};

	const handleMessage = async (userId: Id<"users">) => {
		if (!me?._id) return;
		try {
			const conversationId = await upsertConversation({
				isGroup: false,
				participants: [me._id, userId],
			});
			setSelectedConversation({
				_id: conversationId,
				participants: [me._id, userId],
				isGroup: false,
				image: members?.find((m) => m._id === userId)?.image,
				name: members?.find((m) => m._id === userId)?.name,
				isOnline: members?.find((m) => m._id === userId)?.isOnline,
			});
		} catch (error) {
			console.error(error);
			toast.error("Não foi possível iniciar a conversa.");
		}
	};

	return (
		<section className={className}>
			<div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<p className='text-sm font-semibold'>Member(s)</p>
					<p className='text-xs text-muted-foreground'>
						{members ? `${members.length} no total` : "Carregando…"}
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>{onAddMembers}</div>
			</div>


			<SearchBar
				placeholder='Search members…'
				filterText={searchParam}
				onFilterTextChange={setSearchParam}
				className='mb-3'
			/>
			<div
				className='max-h-96 space-y-4 overflow-y-auto rounded-3xl border border-border/80 bg-muted/80 dark:bg-slate-950 p-4 shadow dark:shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
				onScroll={handleScroll}
			>
				{!members && <p className='text-sm text-muted-foreground'>Loading members…</p>}
				{members && members.length === 0 && (
					<p className='text-sm text-muted-foreground'>No members found..</p>
				)}
				{displayedMembers.map((member) => {
					const isAdmin = conversation.admins?.includes(member._id);
					const isSelf = member._id === me?._id;
					return (
						<div
							key={member._id}
							className='flex items-center gap-3 rounded-2xl border border-border/60 bg-card/95 dark:bg-slate-900 px-4 py-3 shadow-sm'
						>
							<Avatar className='overflow-visible'>
																	{member.isOnline && (
																		<div className='absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full' />
																	)}
							
																	<AvatarImage src={member.image} className='rounded-full object-cover' />
																	<AvatarFallback>
																		<div className='animate-pulse bg-gray-tertiary w-full h-full rounded-full'></div>
																	</AvatarFallback>
																</Avatar>
							<div className='flex-1'>
								<p className='text-sm font-medium'>
									{member.name || member.email?.split("@")[0]}
								</p>
								<p className='text-xs text-muted-foreground'>
									{isSelf ? "You" : member.email}
								</p>
							</div>
							<div className='flex items-center gap-2'>
								{isAdmin && (
									<span className='inline-flex items-center gap-1 rounded-full border border-emerald-200 px-2 py-0.5 text-xs font-semibold bg-emerald-700 text-emerald-100'>
										<Crown size={12} className='text-emerald-100' />
										Group admin
									</span>
								)}

								<DropdownMenu
									open={openMenuUser === member._id}
									onOpenChange={(isOpen) =>
										setOpenMenuUser(isOpen ? member._id : null)
									}
								>
									<DropdownMenuTrigger asChild>
										<Button variant='ghost' size='icon' className='h-8 w-8'>
											<MoreVertical size={16} />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align='end' className='z-[120]'>
										<DropdownMenuItem
											onClick={() => handleMessage(member._id)}
											className='flex items-center gap-2'
										>
											<MessageSquareDiff size={14} />
											Send message
										</DropdownMenuItem>
										{isMeAdmin && !isSelf && (
											<>
												<DropdownMenuItem
													onClick={() => handleKickUser(member._id)}
													className='flex items-center gap-2 text-destructive focus:text-destructive'
												>
													<LogOut size={14} />
													Remove from group
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => handleToggleAdmin(member._id, !isAdmin)}
												>
													{isAdmin ? "Dismiss as admin" : "Make group admin"}
												</DropdownMenuItem>
											</>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					);
				})}
				{canLoadMore && (
					<div className='py-2 text-center text-xs text-muted-foreground'>
						Rolar para carregar mais…
					</div>
				)}
			</div>
		</section>
	);
};

export default GroupMembersSection;
