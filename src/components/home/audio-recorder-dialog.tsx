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

const NUM_WAVE_BARS = 12;

const AudioRecorderDialog = ({isOpen, onClose}: AudioRecorderDialogProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [waveformValues, setWaveformValues] = useState<number[]>(() => Array.from({length: NUM_WAVE_BARS}, () => 0));
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingConfigRef = useRef<{mimeType: string; extension: string}>({
        mimeType: "audio/webm",
        extension: "webm",
    });
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Float32Array | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);
    const sendAudio = useMutation(api.messages.sendAudio);
    const me = useQuery(api.users.getMe);

    const {selectedConversation} = useConversationStore();

    const stopWaveform = () => {
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => undefined);
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        dataArrayRef.current = null;
        setWaveformValues(Array.from({length: NUM_WAVE_BARS}, () => 0));
    };

    const cleanupStream = () => {
        stopWaveform();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    };

    const startWaveform = async (stream: MediaStream) => {
        if (typeof window === "undefined") return;
        stopWaveform();
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextCtor) return;
        const audioContext = new AudioContextCtor();
        audioContextRef.current = audioContext;
        if (audioContext.state === "suspended") {
            try {
                await audioContext.resume();
            } catch (error) {
                console.warn("Failed to resume AudioContext", error);
            }
        }

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.35;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(stream);
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0.0001;
        source.connect(analyser);
        analyser.connect(silentGain);
        silentGain.connect(audioContext.destination);

        const dataArray = new Float32Array(analyser.fftSize);
        dataArrayRef.current = dataArray;

        const updateWaveform = () => {
            const analyserNode = analyserRef.current;
            const data = dataArrayRef.current;
            if (!analyserNode || !data) return;

            analyserNode.getFloatTimeDomainData(data);

            const segmentLength = Math.max(1, Math.floor(data.length / NUM_WAVE_BARS));

            setWaveformValues((prev) =>
                prev.map((prevValue, idx) => {
                    const start = idx * segmentLength;
                    const end = Math.min(start + segmentLength, data.length);
                    let sumSquares = 0;
                    let peak = 0;
                    for (let i = start; i < end; i++) {
                        const v = data[i];
                        sumSquares += v * v;
                        if (Math.abs(v) > peak) {
                            peak = Math.abs(v);
                        }
                    }
                    const sampleCount = Math.max(1, end - start);
                    const rms = Math.sqrt(sumSquares / sampleCount);
                    const energy = Math.max(rms, peak);

                    let target: number;
                    if (energy < 0.008) {
                        // Fast decay back to idle when there is no noticeable audio input.
                        target = prevValue * 0.82;
                    } else {
                        const scaled = Math.min(1, energy * 20 + 0.01);
                        const jitter = (Math.random() - 0.5) * 0.04 * scaled;
                        target = Math.max(0, scaled + jitter);
                    }

                    if (target < 0.012) {
                        target = 0;
                    }

                    const smoothing = target > prevValue ? 0.46 : 0.72;
                    const eased = prevValue * (1 - smoothing) + target * smoothing;
                    return Math.min(1, Math.max(0, eased));
                })
            );

            animationFrameRef.current = requestAnimationFrame(updateWaveform);
        };

        updateWaveform();
    };

    // Sempre resetar estado ao fechar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!isOpen) {
            cleanupStream();
            setIsRecording(false);
            setAudioURL(null);
            audioChunksRef.current = [];
            mediaRecorderRef.current = null;
            recordingConfigRef.current = {
                mimeType: "audio/webm",
                extension: "webm",
            };
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            cleanupStream();
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            const MediaRecorderCtor = window.MediaRecorder;
            if (!MediaRecorderCtor) {
                toast.error("MediaRecorder not supported in this browser");
                return;
            }

            const mimeCandidates = [
                {mimeType: "audio/mp4;codecs=mp4a.40.2", extension: "m4a"},
                {mimeType: "audio/mp4", extension: "m4a"},
                {mimeType: "audio/mpeg", extension: "mp3"},
                {mimeType: "audio/webm;codecs=opus", extension: "webm"},
                {mimeType: "audio/webm", extension: "webm"},
            ] as const;

            const supported =
                mimeCandidates.find((candidate) => {
                    try {
                        return typeof MediaRecorderCtor.isTypeSupported === "function"
                            ? MediaRecorderCtor.isTypeSupported(candidate.mimeType)
                            : candidate.mimeType.includes("webm");
                    } catch {
                        return candidate.mimeType.includes("webm");
                    }
                }) ?? {mimeType: "audio/webm", extension: "webm"};

            recordingConfigRef.current = {
                mimeType: supported.mimeType,
                extension: supported.extension,
            };

            let mediaRecorder: MediaRecorder;
            try {
                mediaRecorder = new MediaRecorderCtor(stream, {mimeType: supported.mimeType});
            } catch {
                recordingConfigRef.current = {mimeType: "audio/webm", extension: "webm"};
                mediaRecorder = new MediaRecorderCtor(stream);
            }

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            streamRef.current = stream;
            await startWaveform(stream);
            mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, {type: recordingConfigRef.current.mimeType});
                if (blob.size > MAX_AUDIO_SIZE_BYTES) {
                    toast.error("Áudio deve ser menor que 40MB");
                    audioChunksRef.current = [];
                    setAudioURL(null);
                    cleanupStream();
                    return;
                }
                setAudioURL(URL.createObjectURL(blob));
                cleanupStream();
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
            const {mimeType, extension} = recordingConfigRef.current;
            // transformar em File para manter compatibilidade
            const blob = new Blob(audioChunksRef.current, {type: mimeType});
            if (blob.size > MAX_AUDIO_SIZE_BYTES) {
                toast.error("Áudio deve ser menor que 40MB");
                setAudioURL(null);
                audioChunksRef.current = [];
                return;
            }

            setIsLoading(true);
            const fileName = `audio_${Date.now()}.${extension}`;
            const file = new File([blob], fileName, {type: mimeType});

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
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="w-full !max-w-[90%] sm:!max-w-4xl p-2">
                    <DialogTitle>Record Audio</DialogTitle>
                    <DialogDescription asChild>
                        {/* Indicador de gravação */}
                        <div className="flex flex-col gap-4 items-center text-sm text-muted-foreground">
                            {isRecording && (
                                <div className="flex w-full flex-col items-center gap-3">
                                    
                                    {waveformValues ? (<div className="flex h-12 items-end justify-center gap-[3px]">
                                        {waveformValues.map((value, index) => (
                                            <span
                                                key={index}
                                                className="wave-bar"
                                                style={{
                                                    height: `${12 + value * 56}px`,
                                                    opacity: 0.35 + value * 0.55,
                                                }}
                                            />
                                        ))}
                                    </div>)
                                    :(<div className="flex items-center gap-2">
                                        <span className="animate-pulse text-red-500">●</span>
                                        <span>Recording...</span>
                                    </div>
                                )}
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
                                    <audio
                                        src={audioURL}
                                        preload={"auto"}
                                        controls
                                        controlsList="nodownload" // esconde o botão de download
                                        onContextMenu={(e) => e.preventDefault()} // bloqueia o clique direito
                                        className="w-full"
                                    />
                                    <div className="flex gap-2 w-full">
                                        <Button
                                            variant="destructive"
                                            disabled={isLoading}
                                            onClick={handleDiscard}
                                            className="flex-1"
                                        >
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
            <style jsx>{`
                .wave-bar {
                    width: 6px;
                    height: 12px;
                    background: rgba(248, 113, 113, 0.9);
                    border-radius: 9999px;
                    transition: height 0.1s ease, opacity 0.1s ease;
                }
            `}</style>
        </>
    );
};

export default AudioRecorderDialog;
