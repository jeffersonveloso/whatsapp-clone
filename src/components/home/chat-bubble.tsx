import {MessageSeenSvg} from "@/lib/svgs";
import {IMessage, useConversationStore} from "@/store/chat-store";
import ChatBubbleAvatar from "./chat-bubble-avatar";
import DateIndicator from "./date-indicator";
import Image from "next/image";
import {useState} from "react";
import {Dialog, DialogContent, DialogDescription, DialogTitle} from "../ui/dialog";
import ReactPlayer from "react-player";
import MessageOptionsMenu from "./message-options-menu";
import {Bot} from "lucide-react";

type ChatBubbleProps = {
    message: IMessage;
    me: any;
    previousMessage?: IMessage;
};

const ChatBubble = ({me, message, previousMessage}: ChatBubbleProps) => {
    const date = new Date(message._creationTime);
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");
    const time = `${hour}:${minute}`;

    const {selectedConversation} = useConversationStore();
    const isMember = selectedConversation?.participants.includes(message.sender?._id) || false;
    const isGroup = selectedConversation?.isGroup;
    const fromMe = message.sender?._id === me._id;
    const fromAI = message.sender?.name === "ChatGPT";
    const bgClass = fromMe ? "bg-green-chat" : !fromAI ? "bg-white dark:bg-gray-primary" : "bg-blue-500 text-white";

    const [open, setOpen] = useState(false);

    const renderMessageContent = () => {
        switch (message.messageType) {
            case "text":
                return <TextMessage message={message}/>;
            case "image":
                return <ImageMessage message={message} handleClick={() => setOpen(true)}/>;
            case "video":
                return <VideoMessage message={message}/>;
            case "audio":
                return <AudioMessage message={message}/>;
            default:
                return null;
        }
    };

    const isMediaMessage = message.messageType !== "text";
    const bubbleWidthClass = isMediaMessage
        ? "w-full"
        : "w-fit max-w-[80vw] sm:max-w-[360px] lg:max-w-[420px]";
    const messageBody = renderMessageContent();
    const centeredContent = isMediaMessage ? (
        <div className='flex justify-center items-center'>{messageBody}</div>
    ) : (
        messageBody
    );

    if (!fromMe) {
        return (
            <>
                <DateIndicator message={message} previousMessage={previousMessage}/>
                <div className='flex gap-1 w-full max-w-[60%] sm:max-w-[45%] lg:max-w-[35%] xl:max-w-[25%]'>
                    <ChatBubbleAvatar isGroup={isGroup} isMember={isMember} message={message} fromAI={fromAI}/>
                    <div className={`flex flex-col z-20 ${bubbleWidthClass} px-2 p-1 rounded-md shadow-md ml-auto relative m-2 ${bgClass}`}>
                        {!fromAI && <OtherMessageIndicator/>}
                        {fromAI && <Bot size={16} className='absolute bottom-[2px] left-2'/>}
                        {<MessageOptionsMenu message={message} me={me}/>}
                        {centeredContent}
                        {open && <ImageDialog src={message.content} open={open} onClose={() => setOpen(false)}/>}
                        <MessageTime time={time} fromMe={fromMe}/>
                    </div>
                </div>
            </>
        );
    }

	return (
		<>
			<DateIndicator message={message} previousMessage={previousMessage} />

			<div className='flex gap-1 w-full max-w-[60%] sm:max-w-[45%] lg:max-w-[35%] xl:max-w-[25%] ml-auto'>
				<div className={`flex flex-col z-20 ${bubbleWidthClass} px-2 p-1 rounded-md shadow-md ml-auto relative m-2 ${bgClass}`}>
					<SelfMessageIndicator />

                    {<MessageOptionsMenu message={message} me={me} />}
                    {centeredContent}
					{open && <ImageDialog src={message.content} open={open} onClose={() => setOpen(false)} />}
					<MessageTime time={time} fromMe={fromMe} />
				</div>
			</div>
		</>
	);
};
export default ChatBubble;

const VideoMessage = ({message}: { message: IMessage }) => (
    <div
        className='relative mx-auto w-full overflow-hidden rounded-md max-w-[380px] lg:max-w-[340px]'
        style={{ aspectRatio: "16 / 9" }}
    >
        <ReactPlayer
            url={message.content}
            width='100%'
            height='100%'
            controls
            light
            config={{
                file: {
                    attributes: {
                        controlsList: "nodownload",
                        onContextMenu: (e: React.MouseEvent) => {
                            e.preventDefault();
                        },
                    },
                },
            }}
        />
    </div>
);

const AudioMessage = ({message}: { message: IMessage }) => {
    return (
        <audio
            src={message.content}
            preload={"auto"}
            controls
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            className='block w-full max-w-[280px] lg:max-w-[240px] outline-none mx-auto'
        />
    );
};

const ImageMessage = ({message, handleClick}: { message: IMessage; handleClick: () => void }) => {
    const [aspectRatio, setAspectRatio] = useState(1);

    return (
        <div
            className='relative mx-auto w-full max-w-[380px] lg:max-w-[340px] overflow-hidden rounded mt-2'
            style={{ aspectRatio }}
        >
            <Image
                src={message.content}
                fill
                sizes='(max-width: 640px) 70vw, (max-width: 1024px) 50vw, 240px'
                className='cursor-pointer object-cover'
                alt='image'
                onClick={handleClick}
                onLoadingComplete={({ naturalWidth, naturalHeight }) => {
                    if (!naturalWidth || !naturalHeight) return;
                    setAspectRatio(naturalWidth / naturalHeight);
                }}
            />
        </div>
    );
};

const ImageDialog = ({src, onClose, open}: { open: boolean; src: string; onClose: () => void }) => {
    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) onClose();
            }}
        >
            <DialogContent className="w-full !max-w-[95vw] sm:!max-w-4xl p-2">
                <DialogTitle/>
                <DialogDescription className='relative h-[450px] flex justify-center'>
                    <Image src={src} fill className='rounded-lg object-contain' alt='image'/>
                </DialogDescription>
            </DialogContent>
        </Dialog>
    );
};

const MessageTime = ({time, fromMe}: { time: string; fromMe: boolean }) => {
    return (
        <p className='text-[10px] mt-2 self-end flex gap-1 items-center'>
            {time} {fromMe && <MessageSeenSvg/>}
        </p>
    );
};

const OtherMessageIndicator = () => (
    <div className='absolute bg-white dark:bg-gray-primary top-0 -left-[4px] w-3 h-3 rounded-bl-full'/>
);

const SelfMessageIndicator = () => (
    <div className='absolute bg-green-chat top-0 -right-[3px] w-3 h-3 rounded-br-full overflow-hidden'/>
);

const TextMessage = ({message}: { message: IMessage }) => {
    const isLink = /^(ftp|http|https):\/\/[^ "]+$/.test(message.content); // Check if the content is a URL

    return (
        <div>
            {isLink ? (
                <a
                    href={message.content}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={`mr-2 text-sm font-light text-blue-400 underline`}
                >
                    {message.content}
                </a>
            ) : (
                <p className={`mr-2 text-sm font-light`}>{message.content}</p>
            )}
        </div>
    );
};