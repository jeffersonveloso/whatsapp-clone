import { MessageSeenSvg } from "@/lib/svgs";
import { IMessage, useConversationStore } from "@/store/chat-store";
import ChatBubbleAvatar from "./chat-bubble-avatar";
import DateIndicator from "./date-indicator";
import Image from "next/image";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import ReactPlayer from "react-player";
import MessageOptionsMenu from "./message-options-menu";
import { Bot, FileText } from "lucide-react";
import { MessageType } from "../../../types/messages";

type MessageReply = NonNullable<IMessage["reply"]>;

type ChatBubbleProps = {
  message: IMessage;
  me: any;
  previousMessage?: IMessage;
};

const ChatBubble = ({ me, message, previousMessage }: ChatBubbleProps) => {
  const date = new Date(message._creationTime);
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  const time = `${hour}:${minute}`;

  const { selectedConversation } = useConversationStore();
  const isMember =
    selectedConversation?.participants.includes(message.sender?._id) || false;
  const isGroup = selectedConversation?.isGroup;
  const fromMe = message.sender?._id === me._id;
  const fromAI = message.sender?.name === "ChatGPT";
  const bgClass = fromMe
    ? "bg-green-chat"
    : !fromAI
      ? "bg-white dark:bg-gray-primary"
      : "bg-blue-500 text-white";

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const renderMessageContent = () => {
    switch (message.messageType) {
      case MessageType.textMessage:
        return <TextMessage content={message.textMessage?.content ?? ""} />;
      case MessageType.imageMessage:
        return (
          <ImageMessage
            image={message.imageMessage}
            onPreview={() => {
              if (message.imageMessage?.url) {
                setLightboxSrc(message.imageMessage.url);
              }
            }}
          />
        );
      case MessageType.videoMessage:
        return <VideoMessage video={message.videoMessage} />;
      case MessageType.audioMessage:
        return <AudioMessage audio={message.audioMessage} />;
      case MessageType.documentMessage:
        return <DocumentMessage document={message.documentMessage} />;
      default:
        return null;
    }
  };

  const isMediaMessage = message.messageType !== MessageType.textMessage;
  const bubbleWidthClass = isMediaMessage
    ? "w-full"
    : "w-fit max-w-[80vw] sm:max-w-[360px] lg:max-w-[420px]";
  const messageBody = renderMessageContent();
  const centeredContent = isMediaMessage ? (
    <div className="flex justify-center items-center">{messageBody}</div>
  ) : (
    messageBody
  );

  if (!fromMe) {
    return (
      <>
        <DateIndicator message={message} previousMessage={previousMessage} />
        <div className="flex gap-1 w-full max-w-[60%] sm:max-w-[45%] lg:max-w-[35%] xl:max-w-[25%]">
          <ChatBubbleAvatar
            isGroup={isGroup}
            isMember={isMember}
            message={message}
            fromAI={fromAI}
          />
          <div
            className={`flex flex-col z-20 ${bubbleWidthClass} px-2 p-1 rounded-md shadow-md relative m-2 ${bgClass}`}
          >
            {!fromAI && <OtherMessageIndicator />}
            {fromAI && (
              <Bot size={16} className="absolute bottom-[2px] left-2" />
            )}
            {<MessageOptionsMenu message={message} me={me} />}
            {message.reply && (
              <ReplyPreviewBubble reply={message.reply} isFromMe={fromMe} />
            )}
            {centeredContent}
            {lightboxSrc && (
              <ImageDialog
                src={lightboxSrc}
                onClose={() => setLightboxSrc(null)}
              />
            )}
            <MessageTime time={time} fromMe={fromMe} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DateIndicator message={message} previousMessage={previousMessage} />

      <div className="flex gap-1 w-full max-w-[60%] sm:max-w-[45%] lg:max-w-[35%] xl:max-w-[25%] ml-auto">
        <div
          className={`flex flex-col z-20 ${bubbleWidthClass} px-2 p-1 rounded-md shadow-md ml-auto relative m-2 ${bgClass}`}
        >
          <SelfMessageIndicator />

          {<MessageOptionsMenu message={message} me={me} />}
          {message.reply && (
            <ReplyPreviewBubble reply={message.reply} isFromMe={fromMe} />
          )}
          {centeredContent}
          {lightboxSrc && (
            <ImageDialog
              src={lightboxSrc}
              onClose={() => setLightboxSrc(null)}
            />
          )}
          <MessageTime time={time} fromMe={fromMe} />
        </div>
      </div>
    </>
  );
};
export default ChatBubble;

const VideoMessage = ({ video }: { video?: IMessage["videoMessage"] }) => {
  if (!video?.url) return null;
  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative mx-auto w-full overflow-hidden rounded-md w-full sm:w-[90%] max-w-[320px] sm:max-w-[460px] min-w-[140px]"
        style={{ aspectRatio: "16 / 9" }}
      >
        <ReactPlayer
          url={video.url}
          width="100%"
          height="100%"
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
      {video.caption && (
        <p className="text-xs text-muted-foreground text-center px-2 whitespace-pre-wrap break-words">
          {video.caption}
        </p>
      )}
    </div>
  );
};

const AudioMessage = ({ audio }: { audio?: IMessage["audioMessage"] }) => {
  if (!audio?.url) return null;
  return (
    <div className="flex flex-col gap-2 items-center w-full">
      <div
        className="relative w-full sm:w-[90%] max-w-[320px] sm:max-w-[460px] min-w-[140px] overflow-hidden"
      >
        <audio
          src={audio.url}
          preload={"auto"}
          controls
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          className="block w-full outline-none mx-auto"
        />
      </div>
    </div>
  );
};

const ImageMessage = ({
  image,
  onPreview,
}: {
  image?: IMessage["imageMessage"];
  onPreview: () => void;
}) => {
  if (!image?.url) return null;
    const [aspectRatio, setAspectRatio] = useState(4 / 3);
    const clampedRatio = Math.min(Math.max(aspectRatio, 0.8), 1.4);

    const containerStyle = {
        aspectRatio: clampedRatio,
        maxHeight: "60vh",
    } as React.CSSProperties;

    return (
        <div className="flex flex-col gap-2 items-center w-full">
            <div
                className="relative rounded-md w-full sm:w-[90%] max-w-[300px] sm:max-w-[420px] min-w-[140px] overflow-hidden"
                style={containerStyle}
            >
                <Image
          src={image.url}
          fill
          priority={false}
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 60vw, 460px"
          className="rounded-md cursor-pointer object-contain"
          alt={image.caption || "Image attachment"}
          onClick={onPreview}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (!naturalWidth || !naturalHeight) return;
            const ratio = naturalWidth / naturalHeight;
            if (!Number.isFinite(ratio) || ratio <= 0) return;
            setAspectRatio(ratio);
          }}
        />
      </div>
      {image.caption && (
        <p className="w-[90%] text-xs text-muted-foreground text-center px-2 whitespace-pre-wrap break-words">
          {image.caption}
        </p>
      )}
    </div>
  );
};

const ImageDialog = ({
  src,
  onClose,
}: {
  src: string | null;
  onClose: () => void;
}) => {
  if (!src) return null;
  return (
    <Dialog
      open={Boolean(src)}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="w-full !max-w-[90%] sm:!max-w-4xl p-2">
        <DialogTitle />
        <DialogDescription className="relative h-[450px] flex justify-center">
          <Image
            src={src}
            fill
            className="rounded-lg object-contain"
            alt="image"
          />
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

const MessageTime = ({ time, fromMe }: { time: string; fromMe: boolean }) => {
  return (
    <p className="text-[10px] mt-2 self-end flex gap-1 items-center">
      {time} {fromMe && <MessageSeenSvg />}
    </p>
  );
};

const OtherMessageIndicator = () => (
  <div className="absolute bg-white dark:bg-gray-primary top-0 -left-[4px] w-3 h-3 rounded-bl-full" />
);

const SelfMessageIndicator = () => (
  <div className="absolute bg-green-chat top-0 -right-[3px] w-3 h-3 rounded-br-full overflow-hidden" />
);

const TextMessage = ({ content }: { content: string }) => {
  const isLink = /^(ftp|http|https):\/\/[^ "]+$/.test(content);

  return (
    <div>
      {isLink ? (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className={`mr-2 text-sm font-light text-blue-400 underline`}
        >
          {content}
        </a>
      ) : (
        <p
          className={`mr-2 text-sm font-light whitespace-pre-wrap break-words`}
        >
          {content}
        </p>
      )}
    </div>
  );
};

const DocumentMessage = ({
  document,
}: {
  document?: IMessage["documentMessage"];
}) => {
  if (!document?.url) return null;

  return (
    <a
      href={document.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-blue-500 underline"
    >
      <FileText size={16} />
      {document.title || document.fileName || "Document"}
    </a>
  );
};

const ReplyPreviewBubble = ({
  reply,
  isFromMe,
}: {
  reply: MessageReply;
  isFromMe: boolean;
}) => {
  const author =
    reply.participant?.name ||
    reply.participant?.email?.split("@")[0] ||
    (reply.participant ? "Unknown" : "ChatGPT");
  const summary = getQuotedSummary(reply);

  return (
    <div
      className={`mb-2 rounded-md border-l-4 px-2 py-1 text-xs text-muted-foreground ${
        isFromMe ? "border-green-500/80" : "border-blue-500/80"
      } bg-gray-200/60 dark:bg-gray-800/40`}
    >
      <p className="font-semibold">{author}</p>
      <p className="mt-1 whitespace-pre-wrap break-words">{summary}</p>
    </div>
  );
};

const getQuotedSummary = (reply: MessageReply): string => {
  switch (reply.quotedConversationType) {
    case MessageType.textMessage:
      return reply.quotedMessage?.content || "";
    case MessageType.imageMessage:
      return reply.quotedMessage?.caption || "Photo";
    case MessageType.videoMessage:
      return reply.quotedMessage?.caption || "Video";
    case MessageType.documentMessage:
      return (
        reply.quotedMessage?.title ||
        reply.quotedMessage?.fileName ||
        "Document"
      );
    case MessageType.audioMessage:
      return "Audio message";
    default:
      return "Message";
  }
};
