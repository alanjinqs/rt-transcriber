import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePiP } from "./use-pip";
import { useSoniox } from "./use-soniox";
import { ControlPanel } from "./component/ControlPanel";

function App() {
	const [finishedJapaneseText, setFinishedJapaneseText] = useState("");
	const [finishedTranslatedText, setFinishedTranslatedText] = useState("");

	const [texts, setTexts] = useState<
		{ japanese: string; translated: string; id: string }[]
	>([]);
	const [pendingJapanese, setPendingJapanese] = useState("");
	const [pendingTanslatedText, setPendingTanslatedText] = useState("");
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
	const [apiKey, setApiKey] = useState("");
	const [targetLanguage, setTargetLanguage] = useState("en");

	// Soniox recording hook
	const { isRecording, status, startRecording, stopRecording } = useSoniox({
		apiKey,
		selectedDeviceId,
		targetLanguage,
		onFinalOriginalText: (text) =>
			setFinishedJapaneseText((prev) => prev + text),
		onFinalTranslatedText: (text) =>
			setFinishedTranslatedText((prev) => prev + text),
		onPendingOriginalText: setPendingJapanese,
		onPendingTranslatedText: setPendingTanslatedText,
	});

	useEffect(() => {
		if (finishedJapaneseText && finishedTranslatedText) {
			setTexts((prev) => [
				...prev,
				{
					japanese: finishedJapaneseText,
					translated: finishedTranslatedText,
					id: crypto.randomUUID(),
				},
			]);
			setFinishedJapaneseText("");
			setFinishedTranslatedText("");
		}
	}, [finishedJapaneseText, finishedTranslatedText]);

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
	};

	return (
		<div className="bg-neutral-200">
			<div className="p-8 max-w-6xl mx-auto h-screen flex flex-col">
				<ControlPanel
					isRecording={isRecording}
					status={status}
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
				/>

				<OrigAndTranslatedTexts
					texts={texts}
					onGoingJapanese={pendingJapanese}
					onGoingTranslated={pendingTanslatedText}
				/>
			</div>

			{/* Picture-in-Picture Window Content */}
			{pipWindow &&
				createPortal(
					<div className="bg-gray-100 flex flex-col h-[540px] relative">
						<OrigAndTranslatedTexts
							texts={texts}
							onGoingJapanese={pendingJapanese}
							onGoingTranslated={pendingTanslatedText}
						/>
						<button
							type="button"
							onClick={isRecording ? stopRecording : startRecording}
							className={`absolute top-4 right-4 size-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ${
								isRecording
									? "bg-red-500 hover:bg-red-600 animate-pulse"
									: "bg-blue-500 hover:bg-blue-600"
							} text-white`}
							title={isRecording ? "Stop Recording" : "Start Recording"}
						>
							{isRecording ? (
								<svg
									className="w-6 h-6"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Stop Recording</title>
									<rect x="6" y="6" width="12" height="12" rx="1" />
								</svg>
							) : (
								<svg
									className="w-6 h-6"
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

const OrigAndTranslatedTexts = ({
	texts,
	onGoingJapanese,
	onGoingTranslated,
}: {
	texts: { japanese: string; translated: string; id: string }[];
	onGoingJapanese: string;
	onGoingTranslated: string;
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
			className="flex-1 overflow-y-auto bg-white p-8 flex flex-col gap-4 pb-10"
			ref={scrollRef}
		>
			{texts.map((text) => (
				<div key={text.id}>
					<div>{text.japanese}</div>
					<div className="opacity-50 text-sm">{text.translated}</div>
				</div>
			))}
			<div className="text-blue-500/80 text-italic">
				<div>{onGoingJapanese}</div>
				<div>{onGoingTranslated}</div>
			</div>
		</div>
	);
};

export default App;
