import {Laugh, Mic, Send, X} from "lucide-react";
import {Input} from "../ui/input";
import {useState} from "react";
import {Button} from "../ui/button";
import {useMutation, useQuery} from "convex/react";
import {api} from "../../../convex/_generated/api";
import {IMessage, useConversationStore} from "@/store/chat-store";
import toast from "react-hot-toast";
import useComponentVisible from "@/hooks/useComponentVisible";
import EmojiPicker, {Theme} from "emoji-picker-react";
import MediaDropdown from "./media-dropdown";
import AudioRecorderDialog from "@/components/home/audio-recorder-dialog";
import {MessageType} from "../../../types/messages";

const MessageInput = () => {
    const [isAudioOpen, setIsAudioOpen] = useState(false); // estado para o diálogo

    const [msgText, setMsgText] = useState("");
    const {selectedConversation, replyToMessage, clearReplyToMessage} = useConversationStore();
    const {ref, isComponentVisible, setIsComponentVisible} = useComponentVisible(false);

    const me = useQuery(api.users.getMe);
    const sendTextMsg = useMutation(api.messages.sendTextMessage);

    const handleSendTextMsg = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = msgText.trim();
        if (!trimmed) return;
        if (!selectedConversation || !me) {
            toast.error("Unable to send message right now. Please try again.");
            return;
        }

        try {
            await sendTextMsg({
                content: trimmed,
                conversation: selectedConversation._id,
                sender: me._id,
                replyTo: replyToMessage ? { messageId: replyToMessage._id } : undefined,
            });
            setMsgText("");
            clearReplyToMessage();
        } catch (err: any) {
            toast.error(err.message);
            console.error(err);
        }
    };

    const replyPreview = replyToMessage ? getReplyPreview(replyToMessage, me?._id, clearReplyToMessage) : null;

    return (
        <div className='bg-gray-primary p-2 flex gap-4 items-center'>
            <div className='relative flex gap-2 ml-2'>
                {/* EMOJI PICKER WILL GO HERE */}
                <div ref={ref} onClick={() => setIsComponentVisible(true)}>
                    {isComponentVisible && (
                        <EmojiPicker
                            theme={Theme.DARK}
                            onEmojiClick={(emojiObject) => {
                                setMsgText((prev) => prev + emojiObject.emoji);
                            }}
                            style={{position: "absolute", bottom: "1.5rem", left: "1rem", zIndex: 50}}
                        />
                    )}
                    <Laugh className='text-gray-600 dark:text-gray-400'/>
                </div>
                <MediaDropdown/>
            </div>
            <form onSubmit={handleSendTextMsg} className='w-full flex gap-3'>
                <div className='flex-1 flex flex-col gap-2'>
                    {replyPreview}
                    <Input
                        type='text'
                        placeholder='Type a message'
                        className='py-2 text-sm w-full rounded-lg shadow-sm bg-gray-tertiary focus-visible:ring-transparent'
                        value={msgText}
                        onChange={(e) => setMsgText(e.target.value)}
                    />
                </div>
                <div className='mr-4 flex items-center gap-3'>
                    {msgText.length > 0 ? (
                        <Button
                            type='submit'
                            size={"sm"}
                            className='bg-transparent text-foreground hover:bg-transparent'
                        >
                            <Send/>
                        </Button>
                    ) : (
                        <Button
                            type='button'
                            size={"sm"}
                            className='bg-transparent text-foreground hover:bg-transparent'
                            onClick={() => setIsAudioOpen(true)}  // abre o diálogo
                        >
                            <Mic/>
                        </Button>
                    )}

                    {/* Inclui o diálogo de gravação de áudio */}
                    <AudioRecorderDialog
                        isOpen={isAudioOpen}
                        onClose={() => setIsAudioOpen(false)}
                    />
                </div>
            </form>
        </div>
    );
};
export default MessageInput;

const getReplyPreview = (message: IMessage, currentUserId?: string, onClear?: () => void) => {
    const isSelf = currentUserId && message.sender?._id === currentUserId;
    const author = isSelf
        ? "You"
        : message.sender?.name || message.sender?.email?.split("@")[0] || "Unknown";

    const summary = getReplySummary(message);

    return (
        <div className='flex items-start gap-3 rounded-md border border-gray-300 bg-gray-tertiary/50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-primary/60'>
            <div className='flex-1 overflow-hidden'>
                <p className='font-semibold text-muted-foreground'>Replying to {author}</p>
                <p className='mt-1 max-h-12 overflow-hidden whitespace-pre-wrap break-words text-neutral-600 dark:text-neutral-300'>{summary}</p>
            </div>
            <button
                type='button'
                onClick={() => onClear?.()}
                className='rounded-full p-1 text-muted-foreground transition hover:bg-gray-200 hover:text-foreground dark:hover:bg-gray-700'
                aria-label='Cancel reply'
            >
                <X size={12} />
            </button>
        </div>
    );
};

const getReplySummary = (message: IMessage): string => {
    switch (message.messageType) {
        case MessageType.textMessage:
            return message.textMessage?.content || "";
        case MessageType.imageMessage:
            return message.imageMessage?.caption || "Photo";
        case MessageType.videoMessage:
            return message.videoMessage?.caption || "Video";
        case MessageType.documentMessage:
            return message.documentMessage?.title || message.documentMessage?.fileName || "Document";
        case MessageType.audioMessage:
            return "Audio message";
        default:
            return "Message";
    }
};
