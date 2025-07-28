import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
	DialogClose,
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

const PAGE_SIZE = 30;

const UserListDialog = () => {
	const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
	const [groupName, setGroupName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [renderedImage, setRenderedImage] = useState("");
	const [searchParam, setSearchParam] = useState("");

	// debounce com 1000ms de espera
	const searchText = useDebounce(searchParam, 1000);

	const imgRef = useRef<HTMLInputElement>(null);
	const dialogCloseRef = useRef<HTMLButtonElement>(null);

	const upsertConversation = useMutation(api.conversations.upsertConversation);
	const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);
	const me = useQuery(api.users.getMe);

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

			let conversationId;
			if (!isGroup) {
				conversationId = await upsertConversation({
					participants: [...selectedUsers, me?._id!],
					isGroup: false,
				});
			} else {
				const postUrl = await generateUploadUrl();

				const result = await fetch(postUrl, {
					method: "POST",
					headers: { "Content-Type": selectedImage?.type! },
					body: selectedImage,
				});

				const { storageId } = await result.json();

				conversationId = await upsertConversation({
					participants: [...selectedUsers, me?._id!],
					isGroup: true,
					admins: [me?._id!],
					groupName,
					groupImage: storageId,
				});
			}

			dialogCloseRef.current?.click();
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


	return (
		<Dialog>
			<DialogTrigger>
				<p className='text-xs text-muted-foreground text-left flex items-center space-x-1'>New Chat <MessageSquareDiff size={16}/></p>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					{/* TODO: <DialogClose /> will be here */}
					<DialogClose ref={dialogCloseRef} />
					<DialogTitle>Users</DialogTitle>
				</DialogHeader>

				<DialogDescription>Start a new chat</DialogDescription>
				{renderedImage && (
					<div className='w-16 h-16 relative mx-auto'>
						<Image src={renderedImage} fill alt='user image' className='rounded-full object-cover' />
					</div>
				)}
				{/* TODO: input file */}
				<input
					type='file'
					accept='image/*'
					ref={imgRef}
					hidden
					onChange={(e) => setSelectedImage(e.target.files![0])}
				/>
				{selectedUsers.length > 1 && (
					<>
						<Input
							placeholder='Group Name'
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
						/>
						<Button className='flex gap-2' onClick={() => imgRef.current?.click()}>
							<ImageIcon size={20} />
							Group Image
						</Button>
					</>
				)}

				{/* Input de pesquisa */}
				<SearchBar
					placeholder="Buscar usuários…"
					filterText={searchParam}
					onFilterTextChange={handleSearchChange}
					className="relative h-10 mx-3 flex-1"
				/>

				<div
					className='flex flex-col gap-3 overflow-auto max-h-60 border-2 rounded-md bg-gray-100'
					onScroll={handleScroll}
				>
					{users?.map((user) => (
						<div
							key={user._id}
							className={`flex gap-3 items-center p-1 m-1 border-b-2 cursor-pointer active:scale-95 
								transition-all ease-in-out duration-300
							${selectedUsers.includes(user._id) ? "bg-green-primary" : ""}`}
							onClick={() => {
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

							<div className='w-full '>
								<div className='flex items-center justify-between'>
									<p className='text-md font-medium'>{user.name || user?.email?.split("@")[0]}</p>
								</div>
							</div>
						</div>
					))}

					{status === "LoadingMore" && (
						<p className="text-center text-sm text-muted-foreground py-2">
							Carregando…
						</p>
					)}
				</div>
				<div className='flex justify-between'>
					<Button variant={"outline"} onClick={() => dialogCloseRef.current?.click()}>Cancel</Button>
					<Button
						onClick={handleCreateConversation}
						disabled={selectedUsers.length === 0 || (selectedUsers.length > 1 && !groupName) || isLoading}
					>
						{/* spinner */}
						{isLoading ? (
							<div className='w-5 h-5 border-t-2 border-b-2  rounded-full animate-spin' />
						) : (
							"Create"
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
export default UserListDialog;
