import React, { useEffect, useRef, useState } from "react";
import { useConversationStore } from "@/store/chat-store";
import { useGroupInfoStore } from "@/store/ui-store";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, LogOut, Trash2, UserPlus2, X } from "lucide-react";
import UpdateGroupMembersDialog from "@/components/home/update-group-members-dialog";
import toast from "react-hot-toast";
import GroupMembersSection from "@/components/home/group-members-section";
import { Id } from "../../../convex/_generated/dataModel";

const MAX_NAME_LENGTH = 80;

const GroupInfoPanel = () => {
	const { selectedConversation, setSelectedConversation } = useConversationStore();
	const { isGroupInfoOpen, close } = useGroupInfoStore();

	const me = useQuery(api.users.getMe);
	const updateGroupInfo = useMutation(api.conversations.updateGroupInfo);
	const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);
	const kickUser = useMutation(api.conversations.kickUser);

	const fileInputRef = useRef<HTMLInputElement>(null);

	const [groupName, setGroupName] = useState("");
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [removeImage, setRemoveImage] = useState(false);

	const meId = me?._id;
	const isAdmin = !!(meId && selectedConversation?.admins?.includes(meId));

	useEffect(() => {
		if (!selectedConversation?.isGroup) {
			if (isGroupInfoOpen) close();
			setGroupName("");
			setPreviewImage(null);
			setSelectedImage(null);
			setRemoveImage(false);
			return;
		}

		setGroupName(selectedConversation.groupName ?? "");
		setPreviewImage(selectedConversation.groupImage ?? null);
		setSelectedImage(null);
		setRemoveImage(false);
	}, [selectedConversation?._id, selectedConversation?.isGroup, isGroupInfoOpen, close]);

	useEffect(() => {
		if (!selectedImage) return;
		const reader = new FileReader();
		reader.onload = (event) => setPreviewImage(event.target?.result as string);
		reader.readAsDataURL(selectedImage);
	}, [selectedImage]);

	const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			toast.error("Selecione uma imagem válida.");
			event.target.value = "";
			return;
		}

		setRemoveImage(false);
		setSelectedImage(file);
		event.target.value = "";
	};

	const handleRemoveImage = () => {
		setSelectedImage(null);
		setPreviewImage(null);
		setRemoveImage(true);
	};

	const totalMembers = selectedConversation?.participants.length ?? 0;
	const trimmedName = groupName.trim();
	const currentName = selectedConversation?.groupName ?? "";
	const nameChanged = trimmedName !== currentName;
	const imageChanged = !!selectedImage || removeImage;
	const canSave =
		Boolean(isAdmin && selectedConversation?.isGroup) &&
		trimmedName.length > 0 &&
		(nameChanged || imageChanged);

	const handleSave = async () => {
		if (!selectedConversation || !isAdmin || !canSave) return;

		setIsSaving(true);
		try {
			let storageId: Id<"_storage"> | undefined;
			if (selectedImage) {
				const postUrl = await generateUploadUrl();
				const uploadResult = await fetch(postUrl, {
					method: "POST",
					headers: { "Content-Type": selectedImage.type },
					body: selectedImage,
				});

				if (!uploadResult.ok) throw new Error("Falha no upload da imagem.");

				const uploadResponse = await uploadResult.json();
				storageId = uploadResponse.storageId;
			}

			const updated = await updateGroupInfo({
				conversationId: selectedConversation._id,
				groupName: trimmedName,
				groupImageStorageId: storageId,
				removeImage: removeImage && !selectedImage ? true : undefined,
			});

			setSelectedConversation({
				...selectedConversation,
				groupName: updated.groupName,
				groupImage: updated.groupImage,
			});

			setSelectedImage(null);
			setRemoveImage(false);
			toast.success("Informações do grupo atualizadas!");
		} catch (error) {
			console.error(error);
			toast.error("Não foi possível atualizar o grupo.");
		} finally {
			setIsSaving(false);
		}
	};

	const showPanel = Boolean(isGroupInfoOpen && selectedConversation?.isGroup);

	const handleLeaveGroup = async () => {
		if (!selectedConversation || !me?._id) return;
		try {
			await kickUser({ conversationId: selectedConversation._id, userId: me._id });
			toast.success("Você saiu do grupo.");
			setSelectedConversation(null);
			close();
		} catch (error) {
			console.error(error);
			toast.error("Não foi possível sair do grupo.");
		}
	};

	return (
		<div
			className={`fixed inset-0 z-[80] transition ${
				showPanel ? "pointer-events-auto visible" : "pointer-events-none invisible"
			}`}
		>
			<div
				className={`absolute inset-0 bg-black/40 transition-opacity ${
					showPanel ? "opacity-100" : "opacity-0"
				}`}
				onClick={close}
			/>
			<aside
				className={`pointer-events-auto absolute right-0 top-0 h-full w-full bg-gray-primary shadow-2xl transition-transform duration-300 sm:w-[420px] ${
					showPanel ? "translate-x-0" : "translate-x-full"
				}`}
			>
				<header className='flex items-center justify-between border-b border-border/60 px-5 py-4'>
					<div>
						<p className='text-xs uppercase tracking-wide text-muted-foreground'>Infos do grupo</p>
						<h2 className='text-xl font-semibold'>
							{selectedConversation?.groupName || "Grupo"}
						</h2>
					</div>
					<Button variant='ghost' size='icon' onClick={close} aria-label='Fechar painel'>
						<X size={18} />
					</Button>
				</header>

				<div className='flex h-full flex-col overflow-hidden'>
					<div className='flex-1 space-y-8 overflow-y-auto px-5 py-6'>
						<section className='flex flex-col items-center gap-4 text-center'>
								<div className='relative w-full'>
									<Avatar className='mx-auto h-24 w-24'>
									<AvatarImage
										src={
											previewImage ??
											selectedConversation?.groupImage ??
											selectedConversation?.image ??
											"/placeholder.png"
										}
										className='object-cover'
									/>
									<AvatarFallback>
										<div className='h-full w-full rounded-full bg-gray-tertiary' />
									</AvatarFallback>
								</Avatar>
								<input
									type='file'
									ref={fileInputRef}
									className='hidden'
									accept='image/*'
									onChange={handleImageChange}
									disabled={!isAdmin}
								/>

								{isAdmin && (
									<div className='mt-3 flex gap-2'>
										<Button
											variant='outline'
											size='sm'
											className='flex-1'
											onClick={() => fileInputRef.current?.click()}
										>
											<Camera size={16} />
											Alterar foto
										</Button>
										<Button
											variant='ghost'
											size='sm'
											disabled={!selectedConversation?.groupImage && !selectedImage}
											onClick={handleRemoveImage}
										>
											<Trash2 size={16} />
										</Button>
									</div>
								)}
							</div>

							<div className='w-full space-y-2'>
								<label className='text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
									Nome do grupo
								</label>
								<Input
									value={groupName}
									onChange={(event) => {
										if (event.target.value.length > MAX_NAME_LENGTH) return;
										setGroupName(event.target.value);
									}}
									disabled={!isAdmin}
									placeholder='Digite o nome do grupo'
									className='font-medium'
								/>
								<div className='flex items-center justify-between text-xs text-muted-foreground'>
									<span>{`${groupName.length}/${MAX_NAME_LENGTH}`}</span>
									<span>Grupo • {totalMembers} membro(s)</span>
								</div>
							</div>

							{isAdmin && (
								<Button
									className='w-full'
									disabled={!canSave || isSaving}
									onClick={handleSave}
								>
									{isSaving ? "Salvando..." : "Salvar alterações"}
								</Button>
							)}
						</section>

						{selectedConversation && (
							<GroupMembersSection
								conversation={selectedConversation}
								isOpen={showPanel}
								onAddMembers={
									isAdmin ? (
										<UpdateGroupMembersDialog
											selectedConversation={selectedConversation}
											trigger={
												<Button variant='outline' size='sm'>
													<UserPlus2 size={16} />
													Adicionar
												</Button>
											}
										/>
									) : undefined
								}
							/>
						)}
					</div>
					<div className='border-t border-border/60 px-5 py-4'>
						<Button
							variant='destructive'
							className='w-full justify-center gap-2'
							onClick={handleLeaveGroup}
						>
							<LogOut size={16} />
							Sair do grupo
						</Button>
					</div>
				</div>
			</aside>
		</div>
	);
};

export default GroupInfoPanel;
