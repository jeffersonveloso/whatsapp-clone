import {useState, useRef, useEffect} from "react";
import {Dialog, DialogContent, DialogDescription} from "../ui/dialog";
import {DialogTitle} from "../ui/dialog";
import {Button} from "../ui/button";
import {useMutation, useQuery} from "convex/react";
import {api} from "../../../convex/_generated/api";
import {useConversationStore} from "@/store/chat-store";
import toast from "react-hot-toast";
import {Mic, Pause, Send, Trash} from "lucide-react";

type AudioRecorderDialogProps = {
    isOpen: boolean;
    onClose: () => void;
};

const MAX_AUDIO_SIZE_BYTES = 40 * 1024 * 1024;

const AudioRecorderDialog = ({isOpen, onClose}: AudioRecorderDialogProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [audioURL, setAudioURL] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);
    const sendAudio = useMutation(api.messages.sendAudio);
    const me = useQuery(api.users.getMe);

    const {selectedConversation} = useConversationStore();

    // Sempre resetar estado ao fechar
    useEffect(() => {
        if (!isOpen) {
            setIsRecording(false);
            setAudioURL(null);
            audioChunksRef.current = [];
            mediaRecorderRef.current = null;
        }
    }, [isOpen]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, {type: "audio/webm"});
                if (blob.size > MAX_AUDIO_SIZE_BYTES) {
                    toast.error("Audio must be smaller than 40MB");
                    audioChunksRef.current = [];
                    setAudioURL(null);
                    return;
                }
                setAudioURL(URL.createObjectURL(blob));
            };
            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            toast.error("Microphone permission denied or unavailable");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const handleSendAudio = async () => {
        if (!audioChunksRef.current.length) return;
        setIsRecording(false);
        try {
            // transformar em File para manter compatibilidade
            const blob = new Blob(audioChunksRef.current, {type: "audio/webm"});
            if (blob.size > MAX_AUDIO_SIZE_BYTES) {
                toast.error("Audio must be smaller than 40MB");
                setAudioURL(null);
                audioChunksRef.current = [];
                return;
            }

            setIsLoading(true);
            const file = new File([blob], `audio_${Date.now()}.webm`, {type: "audio/webm"});

            // 1) gerar URL de upload
            const postUrl = await generateUploadUrl();
            // 2) enviar blob
            const uploadResult = await fetch(postUrl, {
                method: "POST",
                headers: {"Content-Type": file.type},
                body: file,
            });
            const {storageId} = await uploadResult.json();
            // 3) salvar referência no banco
            await sendAudio({
                audioId: storageId,
                conversation: selectedConversation!._id,
                sender: me!._id,
            });

            onClose();
        } catch (err: any) {
            toast.error("Failed to send audio");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiscard = async () => {
        // limpa preview e chunks
        setAudioURL(null);
        audioChunksRef.current = [];
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-full !max-w-[95vw] sm:!max-w-4xl p-2">
                <DialogTitle>Record Audio</DialogTitle>
                <DialogDescription asChild>
                    {/* Indicador de gravação */}
                    <div className="flex flex-col gap-4 items-center text-sm text-muted-foreground">
                        {isRecording && (
                            <div className="flex items-center gap-2">
                                <span className="animate-pulse text-red-500">●</span>
                                <span>Recording...</span>
                            </div>
                        )}
                        <div>
                            <span>Max: 40MB</span>
                        </div>

                        {/* Fluxo de gravação / preview */}
                        {!audioURL ? (
                            <Button onClick={isRecording ? stopRecording : startRecording} className="w-full">
                                {isRecording ? "Stop Recording" : "Start Recording"}
                                {isRecording ? <Pause/> : <Mic/>}
                            </Button>
                        ) : (
                            <>
                                <audio src={audioURL}
                                       preload={"auto"}
                                       controls
                                       controlsList="nodownload"          // esconde o botão de download
                                       onContextMenu={(e) => e.preventDefault()} // bloqueia o clique direito
                                       className="w-full"
                                />
                                <div className="flex gap-2 w-full">
                                    <Button
                                        variant="destructive"
                                        disabled={isLoading}
                                        onClick={handleDiscard} className="flex-1">
                                        Dischard <Trash/>
                                    </Button>
                                    <Button
                                        onClick={handleSendAudio}
                                        disabled={!audioURL || isLoading}
                                        className="w-full"
                                    >
                                        {isLoading ? "Sending..." : "Send"} <Send/>
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogDescription>
            </DialogContent>
        </Dialog>
    );
};

export default AudioRecorderDialog;
