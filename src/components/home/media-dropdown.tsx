import { useEffect, useMemo, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ImageIcon, Plus, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import Image from "next/image";
import toast from "react-hot-toast";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConversationStore } from "@/store/chat-store";
import { Label } from "@radix-ui/react-dropdown-menu";
const MAX_MEDIA_SIZE_BYTES = 40 * 1024 * 1024;

const MediaDropdown = () => {
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [videoCaption, setVideoCaption] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);
  const sendImage = useMutation(api.messages.sendImage);
  const sendVideo = useMutation(api.messages.sendVideo);
  const me = useQuery(api.users.getMe);

  const { selectedConversation } = useConversationStore();

  const handleSendImage = async () => {
    if (!selectedImage) return;
    if (!selectedConversation || !me) {
      toast.error("Unable to send media right now. Please try again.");
      return;
    }
    const conversationId = selectedConversation._id;
    const senderId = me._id;

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
        conversation: conversationId,
        imgId: storageId,
        sender: senderId,
        caption: imageCaption.trim() || undefined,
      });

      setSelectedImage(null);
      setImageCaption("");
    } catch (err) {
      toast.error("Failed to send image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVideo = async () => {
    if (!selectedVideo) return;
    if (!selectedConversation || !me) {
      toast.error("Unable to send media right now. Please try again.");
      return;
    }
    const conversationId = selectedConversation._id;
    const senderId = me._id;

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
        conversation: conversationId,
        sender: senderId,
        caption: videoCaption.trim() || undefined,
      });

      setSelectedVideo(null);
      setVideoCaption("");
    } catch (error) {
      toast.error("Failed to send video");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={imageInput}
        accept="image/*"
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
        type="file"
        ref={videoInput}
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,.mkv,.mov,.avi"
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
          onClose={() => {
            setSelectedImage(null);
            setImageCaption("");
          }}
          selectedImage={selectedImage}
          caption={imageCaption}
          onCaptionChange={setImageCaption}
          isLoading={isLoading}
          handleSendImage={handleSendImage}
        />
      )}

      {selectedVideo && (
        <MediaVideoDialog
          isOpen={selectedVideo !== null}
          onClose={() => {
            setSelectedVideo(null);
            setVideoCaption("");
          }}
          selectedVideo={selectedVideo}
          caption={videoCaption}
          onCaptionChange={setVideoCaption}
          isLoading={isLoading}
          handleSendVideo={handleSendVideo}
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Plus className="text-gray-600 dark:text-gray-400" />
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => imageInput.current!.click()}>
            <ImageIcon size={18} className="mr-1" /> Photo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => videoInput.current!.click()}>
            <Video size={20} className="mr-1" />
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
  caption: string;
  onCaptionChange: (value: string) => void;
  isLoading: boolean;
  handleSendImage: () => void;
};

const MediaImageDialog = ({
  isOpen,
  onClose,
  selectedImage,
  caption,
  onCaptionChange,
  isLoading,
  handleSendImage,
}: MediaImageDialogProps) => {
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
      <DialogContent className="w-full !max-w-[90%] sm:!max-w-4xl p-2">
        <DialogTitle>Media</DialogTitle>
        <DialogDescription>Image</DialogDescription>
        <div className="flex flex-col gap-4 justify-center items-center w-full">
          {renderedImage && (
            <Image
              src={renderedImage}
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 60vw, 460px"
              className="rounded-md cursor-pointer object-contain"
              alt="selected image"
              priority
            />
          )}
        </div>
        <div>
          <Label aria-label="caption message">Caption</Label>
          <textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Add a caption (optional)"
            className="mt-4 w-full rounded-md border border-gray-300 bg-gray-tertiary p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-primary dark:border-gray-600 dark:bg-gray-primary"
            rows={3}
          />
        </div>

        <Button
          className="w-full"
          disabled={isLoading}
          onClick={handleSendImage}
        >
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
  caption: string;
  onCaptionChange: (value: string) => void;
  isLoading: boolean;
  handleSendVideo: () => void;
};

const MediaVideoDialog = ({
  isOpen,
  onClose,
  selectedVideo,
  caption,
  onCaptionChange,
  isLoading,
  handleSendVideo,
}: MediaVideoDialogProps) => {
  const [renderedVideo, setRenderedVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedVideo) {
      setRenderedVideo(null);
      return;
    }

    const url = URL.createObjectURL(selectedVideo);
    setRenderedVideo(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedVideo]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="w-full !max-w-[90%] sm:!max-w-4xl p-2">
        <DialogTitle>Media</DialogTitle>
        <DialogDescription>Video</DialogDescription>
        <div className="w-full">
          {renderedVideo && (
            <video
              key={selectedVideo?.name ?? "video-preview"}
              controls
              preload="metadata"
              className="w-full max-h-[420px] rounded-md bg-black"
            >
              <source
                src={renderedVideo}
                type={selectedVideo.type || "video/mp4"}
              />
              Your browser does not support the video preview.
            </video>
          )}
        </div>
        <div>
          <Label aria-label="caption message">Caption</Label>
          <textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Add a caption (optional)"
            className="mt-4 w-full rounded-md border border-gray-300 bg-gray-tertiary p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-primary dark:border-gray-600 dark:bg-gray-primary"
            rows={3}
          />
        </div>

        <Button
          className="w-full"
          disabled={isLoading}
          onClick={handleSendVideo}
        >
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
