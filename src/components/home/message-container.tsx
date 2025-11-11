import ChatBubble from "./chat-bubble";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { IMessage, useConversationStore } from "@/store/chat-store";
import { useEffect, useMemo, useRef } from "react";

const MessageContainer = () => {
	const { selectedConversation, pendingMessages } = useConversationStore();
	const messages = useQuery(api.messages.getMessages, {
		conversation: selectedConversation!._id,
	});
	const me = useQuery(api.users.getMe);
	const lastMessageRef = useRef<HTMLDivElement>(null);

	const safeMessages = useMemo(() => {
		if (!messages) return [];
		return messages.filter((message) => Boolean(message?.sender)) as IMessage[];
	}, [messages]);

	const optimisticMessages = useMemo(() => {
		if (!selectedConversation) return [];
		return pendingMessages[selectedConversation._id] ?? [];
	}, [pendingMessages, selectedConversation]);

	const allMessages = useMemo(() => {
		return [...safeMessages, ...optimisticMessages];
	}, [optimisticMessages, safeMessages]);

	useEffect(() => {
		setTimeout(() => {
			lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 100);
	}, [allMessages]);

	return (
		<div className='relative p-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden h-full bg-chat-tile-light dark:bg-chat-tile-dark'>
			<div className='mx-3 flex flex-col gap-3'>
				{allMessages.map((msg, idx) => (
					<div key={msg._id} ref={lastMessageRef}>
						<ChatBubble
							message={msg}
							me={me}
							previousMessage={idx > 0 ? allMessages[idx - 1] : undefined}
						/>
					</div>
				))}
			</div>
		</div>
	);
};
export default MessageContainer;
