export enum MessageType {
	textMessage = "textMessage",
	imageMessage = "imageMessage",
	videoMessage = "videoMessage",
	documentMessage = "documentMessage",
	audioMessage = "audioMessage",
}

export type TextMessageEntity = {
	content: string;
};

export type ImageMessageEntity = {
	url: string;
	caption?: string;
};

export type VideoMessageEntity = {
	url: string;
	caption?: string;
	gifPlayback: boolean;
};

export type AudioMessageEntity = {
	url: string;
};

export type DocumentMessageEntity = {
	mimetype: string;
	url: string;
	length: number;
	caption?: string | null;
	largeMediaError?: boolean | null;
	jpegThumbnail?: string | null;
	title: string;
	pageCount?: number | null;
	fileName?: string | null;
};

export type ReplyParticipantSnapshot<TUserId = string> = {
	_id: TUserId;
	image: string;
	name?: string;
	tokenIdentifier: string;
	email: string;
	_creationTime: number;
	isOnline: boolean;
};

export type ReplyEntity<TUserId = string, TMessageId = string> = {
	messageId: TMessageId;
	quotedConversationType: MessageType;
	quotedMessage?: Record<string, any> | null;
	participant?: ReplyParticipantSnapshot<TUserId>;
};
