import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePiP } from "./use-pip";
import { useSoniox } from "./use-soniox";
import { useVibrato, type VibratoToken } from "./use-vibrato";
import { ControlPanel } from "./component/ControlPanel";

export type AudioSource = "microphone" | "screen";

function App() {
	const [finishedJapaneseText, setFinishedJapaneseText] = useState("");
	const [finishedTranslatedText, setFinishedTranslatedText] = useState("");

	const [texts, setTexts] = useState<
		{ japanese: string; translated: string; id: string; tokens?: VibratoToken[] }[]
	>([]);
	const [pendingJapanese, setPendingJapanese] = useState("");
	const [pendingTanslatedText, setPendingTanslatedText] = useState("");
	const [pendingTokens, setPendingTokens] = useState<VibratoToken[]>([]);
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
	const [apiKey, setApiKey] = useState("");
	const [targetLanguage, setTargetLanguage] = useState("en");
	const [audioSource, setAudioSource] = useState<AudioSource>("screen");
	const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
	const displayVideoTrackRef = useRef<MediaStreamTrack | null>(null);

	// Soniox recording hook
	const {
		isRecording,
		status,
		startRecording: startSonioxRecording,
		stopRecording: stopSonioxRecording,
	} = useSoniox({
		apiKey,
		selectedDeviceId,
		targetLanguage,
		stream: audioSource === "screen" ? screenStream : null,
		onFinalOriginalText: (text) => {
			setFinishedJapaneseText((prev) => prev + text);
		},
		onFinalTranslatedText: (text) => {
			setFinishedTranslatedText((prev) => prev + text);
		},
		onPendingOriginalText: setPendingJapanese,
		onPendingTranslatedText: setPendingTanslatedText,
	});

	const { tokenize, status: vibratoStatus, loadDictionary, hasDictionary } = useVibrato();
	const pendingRequestId = useRef(0);

	// Request screen share and get audio stream
	const requestScreenShare = async (): Promise<MediaStream | null> => {
		try {
			const displayStream = await navigator.mediaDevices.getDisplayMedia({
				video: true,
				audio: true,
			});

			// Check if audio track exists
			const audioTracks = displayStream.getAudioTracks();
			if (audioTracks.length === 0) {
				alert(
					"No audio track found. Make sure to share a Chrome tab with audio enabled.",
				);
				displayStream.getTracks().forEach((track) => {
					track.stop();
				});
				return null;
			}

			// Listen for when user stops sharing (video track ends when user clicks "Stop sharing")
			const videoTrack = displayStream.getVideoTracks()[0];
			displayVideoTrackRef.current = videoTrack;

			videoTrack?.addEventListener("ended", () => {
				displayVideoTrackRef.current = null;
				setScreenStream(null);
				setAudioSource("microphone");
			});

			// Create a new MediaStream with only audio tracks
			// This is important because Soniox expects audio-only stream
			const audioOnlyStream = new MediaStream(audioTracks);

			return audioOnlyStream;
		} catch (error) {
			console.error("Failed to get screen share:", error);
			return null;
		}
	};

	// Wrapper functions for start/stop recording
	const startRecording = async () => {
		if (audioSource === "screen") {
			const stream = await requestScreenShare();
			if (!stream) {
				return;
			}
			setScreenStream(stream);
			// Need to wait for state update, so we'll start recording after stream is set
		} else {
			startSonioxRecording();
		}
	};

	// Effect to start recording after screen stream is set
	useEffect(() => {
		if (screenStream && audioSource === "screen" && !isRecording) {
			startSonioxRecording();
		}
	}, [screenStream, audioSource, isRecording, startSonioxRecording]);

	const stopRecording = () => {
		stopSonioxRecording();
		// Clean up screen stream and video track
		if (screenStream) {
			screenStream.getTracks().forEach((track) => {
				track.stop();
			});
			setScreenStream(null);
		}
		if (displayVideoTrackRef.current) {
			displayVideoTrackRef.current.stop();
			displayVideoTrackRef.current = null;
		}
	};

	useEffect(() => {
		if (!finishedJapaneseText || !finishedTranslatedText) {
			return;
		}

		const japaneseText = finishedJapaneseText;
		const translatedText = finishedTranslatedText;
		const id = crypto.randomUUID();

		setFinishedJapaneseText("");
		setFinishedTranslatedText("");

		setTexts((prev) => [
			...prev,
			{
				japanese: japaneseText,
				translated: translatedText,
				id,
				tokens: undefined,
			},
		]);

		if (hasDictionary) {
			tokenize(japaneseText).then((tokens) => {
				setTexts((prev) =>
					prev.map((t) => (t.id === id ? { ...t, tokens } : t))
				);
			});
		}
	}, [finishedJapaneseText, finishedTranslatedText, tokenize, hasDictionary]);

	useEffect(() => {
		if (!hasDictionary) {
			setPendingTokens([]);
			return;
		}
		let isActive = true;
		const requestId = ++pendingRequestId.current;
		const timer = window.setTimeout(async () => {
			const tokens = await tokenize(pendingJapanese);
			if (isActive && requestId === pendingRequestId.current) {
				setPendingTokens(tokens);
			}
		}, 250);
		return () => {
			isActive = false;
			window.clearTimeout(timer);
		};
	}, [pendingJapanese, tokenize, hasDictionary]);


	// Picture-in-Picture hook
	const {
		pipWindow,
		openPiP,
		closePiP,
		isSupported: isPiPSupported,
	} = usePiP({
		width: 800,
		height: 600,
	});

	// Load data from localStorage on mount
	useEffect(() => {
		const savedApiKey = localStorage.getItem("soniox_api_key");
		const savedDeviceId = localStorage.getItem("selected_device_id");
		const savedTargetLanguage = localStorage.getItem("target_language");

		if (savedApiKey) {
			setApiKey(savedApiKey);
		}

		if (savedDeviceId) {
			setSelectedDeviceId(savedDeviceId);
		}

		if (savedTargetLanguage) {
			setTargetLanguage(savedTargetLanguage);
		}
	}, []);

	// Save selected device ID to localStorage whenever it changes
	useEffect(() => {
		if (selectedDeviceId) {
			localStorage.setItem("selected_device_id", selectedDeviceId);
		}
	}, [selectedDeviceId]);

	// Save target language to localStorage whenever it changes
	useEffect(() => {
		localStorage.setItem("target_language", targetLanguage);
	}, [targetLanguage]);

	useEffect(() => {
		const getAudioDevices = async () => {
			try {
				await navigator.mediaDevices.getUserMedia({ audio: true });
				const devices = await navigator.mediaDevices.enumerateDevices();
				const audioInputs = devices.filter((d) => d.kind === "audioinput");
				setAudioDevices(audioInputs);
				if (audioInputs.length > 0 && !selectedDeviceId) {
					setSelectedDeviceId(audioInputs[0].deviceId);
				}
			} catch (error) {
				console.error("Failed to get audio devices:", error);
			}
		};

		getAudioDevices();
	}, [selectedDeviceId]);

	const clearAll = () => {
		setTexts([]);
		setPendingJapanese("");
		setPendingTanslatedText("");
		setPendingTokens([]);
	};

	return (
		<div className="bg-muted">
			<div className="p-6 max-w-4xl mx-auto h-screen flex flex-col">
				<ControlPanel
					isRecording={isRecording}
					status={status}
					vibratoStatus={vibratoStatus}
					startRecording={startRecording}
					stopRecording={stopRecording}
					clearAll={clearAll}
					pipWindow={pipWindow}
					openPiP={openPiP}
					closePiP={closePiP}
					isPiPSupported={isPiPSupported}
					audioDevices={audioDevices}
					selectedDeviceId={selectedDeviceId}
					setSelectedDeviceId={setSelectedDeviceId}
					apiKey={apiKey}
					setApiKey={setApiKey}
					targetLanguage={targetLanguage}
					setTargetLanguage={setTargetLanguage}
					audioSource={audioSource}
					setAudioSource={setAudioSource}
					hasDictionary={hasDictionary}
					onLoadDictionary={loadDictionary}
				/>

				<OrigAndTranslatedTexts
					texts={texts}
					onGoingJapanese={pendingJapanese}
					onGoingTranslated={pendingTanslatedText}
					pendingTokens={pendingTokens}
				/>
			</div>

			{/* Picture-in-Picture Window Content */}
			{pipWindow &&
				createPortal(
					<div className="bg-background flex flex-col h-[540px] relative">
						<OrigAndTranslatedTexts
							texts={texts}
							onGoingJapanese={pendingJapanese}
							onGoingTranslated={pendingTanslatedText}
							pendingTokens={pendingTokens}
						/>
						<button
							type="button"
							onClick={isRecording ? stopRecording : startRecording}
							className={`absolute top-3 right-3 size-8 flex items-center justify-center transition-colors rounded-full ${
								isRecording
									? "bg-destructive hover:bg-destructive/90"
									: "bg-primary hover:bg-primary/90"
							} text-primary-foreground`}
							title={isRecording ? "Stop Recording" : "Start Recording"}
						>
							{isRecording ? (
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Stop Recording</title>
									<rect x="6" y="6" width="12" height="12" />
								</svg>
							) : (
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Start Recording</title>
									<circle cx="12" cy="12" r="6" />
								</svg>
							)}
						</button>
					</div>,
					pipWindow.document.body,
				)}
		</div>
	);
}

const POS_COLORS: Record<string, string> = {
	名詞: "#3b82f6",
	動詞: "#ef4444",
	形容詞: "#f97316",
	副詞: "#8b5cf6",
	助詞: "#22c55e",
	助動詞: "#14b8a6",
	接続詞: "#ec4899",
	感動詞: "#f59e0b",
	連体詞: "#6366f1",
};

const isSymbol = (pos: string): boolean =>
	pos.startsWith("記号") || pos.startsWith("補助記号");

const containsKanji = (text: string): boolean =>
	/[\u4e00-\u9faf\u3400-\u4dbf]/.test(text);

const shouldShowRuby = (token: VibratoToken): boolean => {
	if (!token.pron || token.pron === "*") return false;
	return containsKanji(token.surface);
};

const getColorForPos = (pos: string): string => {
	if (POS_COLORS[pos]) {
		return POS_COLORS[pos];
	}
	for (const [key, color] of Object.entries(POS_COLORS)) {
		if (pos.startsWith(key)) {
			return color;
		}
	}
	return "#9ca3af";
};

const AnnotatedTokens = ({
	tokens,
	isPending = false,
}: {
	tokens: VibratoToken[];
	isPending?: boolean;
}) => {
	return (
		<div className="text-md flex flex-wrap items-baseline leading-[2.5]">
			{tokens.map((token, index) => {
				const showRuby = shouldShowRuby(token);
				const color = getColorForPos(token.pos);

				if (!showRuby) {
					return (
						<span
							key={`${token.surface}-${index}`}
							style={{
								borderBottom: isSymbol(token.pos)
									? undefined
									: `2px solid ${color}`,
								opacity: isPending ? 0.7 : 1,
							}}
							title={token.pos}
						>
							{token.surface}
						</span>
					);
				}
				return (
					<ruby
						key={`${token.surface}-${index}`}
						style={{
							borderBottom: `2px solid ${color}`,
							opacity: isPending ? 0.7 : 1,
						}}
						title={token.pos}
					>
						{token.surface}
						<rp>(</rp>
						<rt className="text-[10px] text-muted-foreground">{token.pron}</rt>
						<rp>)</rp>
					</ruby>
				);
			})}
		</div>
	);
};

const OrigAndTranslatedTexts = ({
	texts,
	onGoingJapanese,
	onGoingTranslated,
	pendingTokens,
}: {
	texts: { japanese: string; translated: string; id: string; tokens?: VibratoToken[] }[];
	onGoingJapanese: string;
	onGoingTranslated: string;
	pendingTokens: VibratoToken[];
}) => {
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (texts.length > 0) {
			if (scrollRef.current) {
				scrollRef.current.scrollTo({
					top: scrollRef.current.scrollHeight,
					behavior: "smooth",
				});
			}
		}
	}, [texts.length]);
	return (
		<div
			className="flex-1 overflow-y-auto bg-card border border-border p-6 pb-10 flex flex-col gap-3"
			ref={scrollRef}
		>
			{texts.map((text) => (
				<div key={text.id} className="space-y-0.5">
					{text.tokens && text.tokens.length > 0 ? (
						<AnnotatedTokens tokens={text.tokens} />
					) : (
						<div className="text-sm text-foreground">{text.japanese}</div>
					)}
					<div className="text-xs text-muted-foreground">{text.translated}</div>
				</div>
			))}
			{(onGoingJapanese || onGoingTranslated) && (
				<div className="space-y-0.5">
					{pendingTokens.length > 0 ? (
						<AnnotatedTokens tokens={pendingTokens} isPending />
					) : (
						<div className="text-sm text-primary">{onGoingJapanese}</div>
					)}
					<div className="text-xs text-primary/60">{onGoingTranslated}</div>
				</div>
			)}
		</div>
	);
};

export default App;
