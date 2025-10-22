import { useEffect, useMemo, useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ImageIcon, Plus, Video } from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogTitle} from "../ui/dialog";
import { Button } from "../ui/button";
import Image from "next/image";
import ReactPlayer from "react-player";
import toast from "react-hot-toast";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConversationStore } from "@/store/chat-store";
const MAX_MEDIA_SIZE_BYTES = 40 * 1024 * 1024;

const MediaDropdown = () => {
	const imageInput = useRef<HTMLInputElement>(null);
	const videoInput = useRef<HTMLInputElement>(null);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [selectedVideo, setSelectedVideo] = useState<File | null>(null);

	const [isLoading, setIsLoading] = useState(false);

	const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);
	const sendImage = useMutation(api.messages.sendImage);
	const sendVideo = useMutation(api.messages.sendVideo);
	const me = useQuery(api.users.getMe);

	const { selectedConversation } = useConversationStore();

	const handleSendImage = async () => {
		if (!selectedImage) return;

		setIsLoading(true);
		try {
			// Step 1: Get a short-lived upload URL
			const postUrl = await generateUploadUrl();
			// Step 2: POST the file to the URL
			const result = await fetch(postUrl, {
				method: "POST",
				headers: { "Content-Type": selectedImage!.type },
				body: selectedImage,
			});

			const { storageId } = await result.json();
			// Step 3: Save the newly allocated storage id to the database
			await sendImage({
				conversation: selectedConversation!._id,
				imgId: storageId,
				sender: me!._id,
			});

			setSelectedImage(null);
		} catch (err) {
			toast.error("Failed to send image");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSendVideo = async () => {
		if (!selectedVideo) return;

		setIsLoading(true);
		try {
			const postUrl = await generateUploadUrl();
			const result = await fetch(postUrl, {
				method: "POST",
				headers: { "Content-Type": selectedVideo!.type },
				body: selectedVideo,
			});

			const { storageId } = await result.json();

			await sendVideo({
				videoId: storageId,
				conversation: selectedConversation!._id,
				sender: me!._id,
			});

			setSelectedVideo(null);
		} catch (error) {
			toast.error("Failed to send video");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			<input
				type='file'
				ref={imageInput}
				accept='image/*'
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (!file) return;
					if (file.size > MAX_MEDIA_SIZE_BYTES) {
						toast.error("Image must be smaller than 40MB");
						e.target.value = "";
						return;
					}
					setSelectedImage(file);
				}}
				hidden
			/>

			<input
				type='file'
				ref={videoInput}
				accept='video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,.mkv,.mov,.avi'
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (!file) return;
					if (file.size > MAX_MEDIA_SIZE_BYTES) {
						toast.error("Video must be smaller than 40MB");
						e.target.value = "";
						return;
					}
					setSelectedVideo(file);
				}}
				hidden
			/>

			{selectedImage && (
				<MediaImageDialog
					isOpen={selectedImage !== null}
					onClose={() => setSelectedImage(null)}
					selectedImage={selectedImage}
					isLoading={isLoading}
					handleSendImage={handleSendImage}
				/>
			)}

			{selectedVideo && (
				<MediaVideoDialog
					isOpen={selectedVideo !== null}
					onClose={() => setSelectedVideo(null)}
					selectedVideo={selectedVideo}
					isLoading={isLoading}
					handleSendVideo={handleSendVideo}
				/>
			)}

			<DropdownMenu>
				<DropdownMenuTrigger>
					<Plus className='text-gray-600 dark:text-gray-400' />
				</DropdownMenuTrigger>

				<DropdownMenuContent>
					<DropdownMenuItem onClick={() => imageInput.current!.click()}>
						<ImageIcon size={18} className='mr-1' /> Photo
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => videoInput.current!.click()}>
						<Video size={20} className='mr-1' />
						Video
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
export default MediaDropdown;

type MediaImageDialogProps = {
	isOpen: boolean;
	onClose: () => void;
	selectedImage: File;
	isLoading: boolean;
	handleSendImage: () => void;
};

const MediaImageDialog = ({ isOpen, onClose, selectedImage, isLoading, handleSendImage }: MediaImageDialogProps) => {
	const [renderedImage, setRenderedImage] = useState<string | null>(null);

	useEffect(() => {
		if (!selectedImage) return;
		const reader = new FileReader();
		reader.onload = (e) => setRenderedImage(e.target?.result as string);
		reader.readAsDataURL(selectedImage);
	}, [selectedImage]);

	return (
			<Dialog
				open={isOpen}
				onOpenChange={(isOpen) => {
					if (!isOpen) onClose();
				}}
			>
				<DialogContent className='w-full !max-w-[95vw] sm:!max-w-4xl p-2'>
					<DialogTitle>Media</DialogTitle>
					<DialogDescription>Image</DialogDescription>
					<div className='flex flex-col gap-4 justify-center items-center w-full'>
						{renderedImage && (
							<Image
								src={renderedImage}
								width={1200}
								height={675}
								alt='selected image'
								priority
								style={{ width: "100%", height: "auto" }}
							/>
						)}
					</div>
					<Button className='w-full' disabled={isLoading} onClick={handleSendImage}>
						{isLoading ? "Sending..." : "Send"}
					</Button>
				</DialogContent>
			</Dialog>
	);
};

type MediaVideoDialogProps = {
	isOpen: boolean;
	onClose: () => void;
	selectedVideo: File;
	isLoading: boolean;
	handleSendVideo: () => void;
};

const MediaVideoDialog = ({ isOpen, onClose, selectedVideo, isLoading, handleSendVideo }: MediaVideoDialogProps) => {
	const renderedVideo = useMemo(() => {
		if (!selectedVideo) return null;
		return URL.createObjectURL(selectedVideo);
	}, [selectedVideo]);

	useEffect(() => {
		return () => {
			if (renderedVideo) URL.revokeObjectURL(renderedVideo);
		};
	}, [renderedVideo]);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className='w-full !max-w-[95vw] sm:!max-w-4xl p-2'>
				<DialogTitle>Media</DialogTitle>
				<DialogDescription>Video</DialogDescription>
				<div className='w-full'>
					{renderedVideo && <ReactPlayer url={renderedVideo} controls width='100%' />}
				</div>
				<Button className='w-full' disabled={isLoading} onClick={handleSendVideo}>
					{isLoading ? "Sending..." : "Send"}
				</Button>
			</DialogContent>
		</Dialog>
	);
};
