import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
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
import {useMutation, usePaginatedQuery, useQuery} from "convex/react";
import { api } from "../../../convex/_generated/api";
import toast from "react-hot-toast";
import { useConversationStore } from "@/store/chat-store";
import SearchBar from "@/components/home/search-bar";
import useDebounce from "@/hooks/useDebouce";
import {UserRole} from "../../../types/roles";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSidebarStore } from "@/store/ui-store";

const PAGE_SIZE = 30;

const UserListDialog = () => {
	const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
	const [groupName, setGroupName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [renderedImage, setRenderedImage] = useState("");
	const [searchParam, setSearchParam] = useState("");
	const [open, setOpen] = useState(false);

	// debounce com 1000ms de espera
	const searchText = useDebounce(searchParam, 1000);

	const imgRef = useRef<HTMLInputElement>(null);

	const upsertConversation = useMutation(api.conversations.upsertConversation);
	const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);
	const me = useQuery(api.users.getMe);
	const isAdmin = me?.role != UserRole.common;
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const { close: closeSidebar } = useSidebarStore();

	// pesquisa e infinite query
	const { results, status, loadMore } = usePaginatedQuery(
		api.users.pagedUsers, // Your paginated query function
		{search: searchText}, // Any additional arguments for your query, e.g., { category: "books" }
		{ initialNumItems: PAGE_SIZE } // Initial number of items to load
	);

	// Achata todas as páginas em um array só
	const users = results?.flatMap((p) => p) ?? [];

	const { setSelectedConversation } = useConversationStore();

	const handleCreateConversation = async () => {
		if (selectedUsers.length === 0) return;
		setIsLoading(true);
		try {
			const isGroup = selectedUsers.length > 1;

			if (isGroup && !isAdmin) {
				toast.error("Only admins can create group chats.");
				return;
			}

			let conversationId;
			if (!isGroup) {
				conversationId = await upsertConversation({
					participants: [...selectedUsers, me?._id!],
					isGroup: false,
				});
			} else {
				let uploadedImageId;
				if (selectedImage) {
					const postUrl = await generateUploadUrl();
					const result = await fetch(postUrl, {
						method: "POST",
						headers: { "Content-Type": selectedImage.type },
						body: selectedImage,
					});

					const uploadResponse = await result.json();
					uploadedImageId = uploadResponse.storageId;
				}

				conversationId = await upsertConversation({
					participants: [...selectedUsers, me?._id!],
					isGroup: true,
					admins: [me?._id!],
					groupName,
					groupImage: uploadedImageId,
				});
			}

			setOpen(false);
			setSelectedUsers([]);
			setGroupName("");
			setSelectedImage(null);

			// TODO => Update a global state called "selectedConversation"
			const conversationName = isGroup ? groupName : users?.find((user) => user._id === selectedUsers[0])?.name;

			setSelectedConversation({
				_id: conversationId,
				participants: selectedUsers,
				isGroup,
				image: isGroup ? renderedImage : users?.find((user) => user._id === selectedUsers[0])?.image,
				name: conversationName,
				admins: [me?._id!],
			});
		} catch (err) {
			toast.error("Failed to create conversation");
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (!selectedImage) return setRenderedImage("");
		const reader = new FileReader();
		reader.onload = (e) => setRenderedImage(e.target?.result as string);
		reader.readAsDataURL(selectedImage);
	}, [selectedImage]);

	// handler do input
	const handleSearchChange = (value: string) => {
		setSearchParam(value);
	};

	// infinite scroll usando status e loadMore
	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const el = e.currentTarget;
		if (
			el.scrollHeight - el.scrollTop <= el.clientHeight + 50 &&
			status === "CanLoadMore"
		) {
			loadMore(PAGE_SIZE);
		}
	};

	const handleTriggerClick = () => {
		setOpen(true);
		if (!isDesktop) {
			closeSidebar();
		}
	};

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}

		if (!file.type.startsWith("image/")) {
			toast.error("Please select a valid image.");
			e.target.value = "";
			return;
		}

		setSelectedImage(file);
		e.target.value = "";
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
			}}
		>
			<DialogTrigger asChild>
				<button
					type='button'
					className='text-xs text-muted-foreground text-left flex items-center space-x-1 hover:text-foreground transition'
					onClick={handleTriggerClick}
				>
					<span>New Chat</span> <MessageSquareDiff size={16}/>
				</button>
			</DialogTrigger>
			<DialogContent className="w-full !max-w-[96vw] sm:!max-w-5xl p-0 border border-border bg-background text-foreground rounded-2xl shadow-2xl z-[130]">
				<div className="flex max-h-[85vh] flex-col gap-5 overflow-hidden p-6 bg-card">
					<DialogHeader className='text-center'>
						<DialogTitle className='text-xl font-semibold'>Selecionar usuários</DialogTitle>
						<DialogDescription>Inicie um novo chat ou crie um grupo</DialogDescription>
					</DialogHeader>

					{renderedImage && (
						<div className='relative mx-auto h-20 w-20'>
							<Image src={renderedImage} fill alt='user image' className='rounded-full object-cover' />
						</div>
					)}
					<input
						type='file'
						accept='image/*'
						ref={imgRef}
						hidden
						onChange={handleImageChange}
					/>
					{selectedUsers.length > 1 && isAdmin && (
						<div className='grid gap-3 rounded-xl border border-border/60 bg-background/60 p-4 shadow-inner'>
							<Input
								placeholder='Nome do grupo'
								className='text-sm'
								value={groupName}
								onChange={(e) => setGroupName(e.target.value)}
							/>
							<Button className='flex gap-2' onClick={() => imgRef.current?.click()}>
								<ImageIcon size={20} />
								Enviar imagem
							</Button>
						</div>
					)}

					<div className='flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground'>
						<p>
							{selectedUsers.length} usuário(s) selecionado(s)
						</p>
						{selectedUsers.length > 0 && (
							<Button variant='ghost' size='sm' onClick={() => setSelectedUsers([])}>
								Limpar seleção
							</Button>
						)}
					</div>

					<SearchBar
						placeholder="Buscar usuários…"
						filterText={searchParam}
						onFilterTextChange={handleSearchChange}
					/>

					<div
						className='flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border/80 bg-muted/60 dark:bg-muted/20 p-3 shadow'
						onScroll={handleScroll}
					>
						{users?.map((user) => (
							<div
								key={user._id}
								className={`flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition hover:border-border hover:bg-card/80 dark:bg-gray-900/60 ${selectedUsers.includes(user._id) ? "ring-2 ring-emerald-500" : ""}`}
								onClick={() => {
									if (!isAdmin && !selectedUsers.includes(user._id) && selectedUsers.length >= 1) {
										toast.error("Only admins can create group chats.");
										return;
									}
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

								<div className='flex w-full items-center justify-between'>
									<div>
										<p className='text-md font-medium'>{user.name || user?.email?.split("@")[0]}</p>
										<p className='text-xs text-muted-foreground'>{user.email}</p>
									</div>
									{selectedUsers.includes(user._id) && (
										<span className='text-xs font-semibold text-emerald-500'>Selecionado</span>
									)}
								</div>
							</div>
						))}

						{status === "LoadingMore" && (
							<p className="py-2 text-center text-sm text-muted-foreground">
								Carregando…
							</p>
						)}
					</div>

					<div className='flex justify-end gap-4'>
						<Button
							type="button"
							variant={"destructive"}
							onClick={() => setOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							onClick={handleCreateConversation}
							disabled={
								selectedUsers.length === 0 ||
								(selectedUsers.length > 1 && (!groupName || !isAdmin)) ||
								isLoading
							}
						>
							{isLoading ? (
								<div className='h-5 w-5 animate-spin rounded-full border-2 border-t-transparent' />
							) : (
								"Criar"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
export default UserListDialog;
