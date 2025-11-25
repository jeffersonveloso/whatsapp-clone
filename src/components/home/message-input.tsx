import {Laugh, Mic, Send, SendHorizonal, X} from "lucide-react";
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
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
    const [isSending, setIsSending] = useState(false);
    const {
        selectedConversation,
        replyToMessage,
        clearReplyToMessage,
        addPendingMessage,
        removePendingMessage,
        setReplyToMessage,
    } = useConversationStore();
    const {ref, isComponentVisible, setIsComponentVisible} = useComponentVisible(false);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const focusComposer = useCallback(() => {
        const node = textareaRef.current;
        if (!node) return;
        node.focus({ preventScroll: true });
        const setCaretToEnd = () => {
            const len = node.value.length;
            node.selectionStart = len;
            node.selectionEnd = len;
        };
        setCaretToEnd();
        requestAnimationFrame(setCaretToEnd);
        setTimeout(setCaretToEnd, 50);
    }, []);

    const me = useQuery(api.users.getMe);
    const sendTextMsg = useMutation(api.messages.sendTextMessage);

    const isMobileKeyboard = useMemo(
        () => (typeof navigator !== "undefined" ? /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) : false),
        [],
    );

    const adjustTextareaSize = useCallback(() => {
        if (typeof window === "undefined") return;
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        const computedLineHeight = parseInt(window.getComputedStyle(el).lineHeight || "20", 10);
        const lineHeight = Number.isFinite(computedLineHeight) && computedLineHeight > 0 ? computedLineHeight : 20;
        const maxHeight = lineHeight * 3;
        const nextHeight = Math.min(el.scrollHeight, maxHeight);
        el.style.height = `${nextHeight}px`;
        el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    }, []);

    const handleSendTextMsg = useCallback(async (e: React.FormEvent | { preventDefault: () => void }) => {
        e.preventDefault();
        if (isSending) return;

        const trimmed = msgText.trim();
        if (!trimmed) return;
        if (!selectedConversation || !me) {
            toast.error("Unable to send message right now. Please try again.");
            return;
        }

        const conversationId = selectedConversation._id;
        const replySnapshot = replyToMessage ?? null;
        const tempId = `temp-${Date.now()}-${Math.random()}` as IMessage["_id"];
        const optimisticMessage: IMessage = {
            _id: tempId,
            conversation: conversationId,
            textMessage: {content: trimmed},
            messageType: MessageType.textMessage,
            sender: {
                _id: me._id,
                image: me.image || "",
                name: me.name,
                tokenIdentifier: me.tokenIdentifier,
                email: me.email!,
                _creationTime: me._creationTime,
                isOnline: me.isOnline,
            },
            _creationTime: Date.now(),
            reply: replySnapshot
                ? {
                    messageId: replySnapshot._id,
                    quotedConversationType: replySnapshot.messageType,
                    quotedMessage: replySnapshot[replySnapshot.messageType] ?? undefined,
                    participant: replySnapshot.sender,
                }
                : undefined,
        };

        addPendingMessage(conversationId, optimisticMessage);
        setMsgText("");
        clearReplyToMessage();
        requestAnimationFrame(adjustTextareaSize);
        setIsSending(true);

        try {
            await sendTextMsg({
                content: trimmed,
                conversation: conversationId,
                sender: me._id,
                replyTo: replySnapshot ? {messageId: replySnapshot._id} : undefined,
            });
            removePendingMessage(conversationId, tempId);
        } catch (err: any) {
            removePendingMessage(conversationId, tempId);
            setMsgText(trimmed);
            if (replySnapshot) {
                setReplyToMessage(replySnapshot);
            }
            requestAnimationFrame(adjustTextareaSize);
            toast.error(err.message);
            console.error(err);
        } finally {
            setIsSending(false);
        }
    }, [
        addPendingMessage,
        adjustTextareaSize,
        clearReplyToMessage,
        isSending,
        me,
        msgText,
        removePendingMessage,
        replyToMessage,
        selectedConversation,
        sendTextMsg,
        setReplyToMessage,
    ]);

    const replyPreview = replyToMessage ? getReplyPreview(replyToMessage, me?._id, clearReplyToMessage) : null;

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setMsgText(event.target.value);
            requestAnimationFrame(adjustTextareaSize);
        },
        [adjustTextareaSize],
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key !== "Enter" || event.shiftKey) {
                return;
            }

            if (isMobileKeyboard) {
                event.preventDefault();
                const target = event.currentTarget;
                const {selectionStart, selectionEnd, value} = target;
                const newValue = `${value.slice(0, selectionStart)}\n${value.slice(selectionEnd)}`;
                target.value = newValue;
                setMsgText(newValue);
                requestAnimationFrame(() => {
                    if (!target) return;
                    const cursor = selectionStart + 1;
                    target.selectionStart = cursor;
                    target.selectionEnd = cursor;
                    adjustTextareaSize();
                });
                return;
            }

            event.preventDefault();
            void handleSendTextMsg(event);
        },
        [adjustTextareaSize, handleSendTextMsg, isMobileKeyboard],
    );

    useEffect(() => {
        adjustTextareaSize();
    }, [adjustTextareaSize, msgText]);

    // Focus input when entering reply mode; run a few times to avoid race with layout
    useLayoutEffect(() => {
        if (!replyToMessage) return;
        focusComposer();
        const t1 = setTimeout(focusComposer, 60);
        const t2 = setTimeout(focusComposer, 150);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [replyToMessage, focusComposer]);

    return (
        <div className='bg-gray-primary p-2 flex gap-4 items-center shrink-0'>
            <div className='relative flex gap-2 ml-2'>
                {/* EMOJI PICKER WILL GO HERE */}
                <div ref={ref} onClick={() => setIsComponentVisible(true)}>
                    {isComponentVisible && (
                        <EmojiPicker
                            theme={Theme.DARK}
                            onEmojiClick={(emojiObject) => {
                                setMsgText((prev) => {
                                    const nextValue = prev + emojiObject.emoji;
                                    requestAnimationFrame(adjustTextareaSize);
                                    return nextValue;
                                });
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
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        placeholder='Type a message'
                        className='py-2 w-full rounded-lg shadow-sm bg-gray-tertiary focus-visible:ring-transparent resize-none h-auto min-h-[40px] p-2 text-left'
                        value={msgText}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        autoComplete='off'
                        autoFocus
                        onBlur={() => {
                            if (!replyToMessage) return;
                            requestAnimationFrame(() => focusComposer());
                        }}
                        style={{overflow: "hidden"}}
                    />
                </div>
                <div className='mr-4 flex items-center gap-3'>
                    {msgText.length > 0 ? (
                        <Button
                            type='submit'
                            size={"sm"}
                            className='bg-transparent text-foreground hover:bg-transparent'
                            disabled={isSending}
                        >
                            <SendHorizonal/>
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
