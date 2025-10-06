import { useState, useRef, useEffect } from "react";
import {
	SonioxClient,
	type SpeechToTextAPIResponse,
} from "@soniox/speech-to-text-web";

interface UseSonioxOptions {
	apiKey: string;
	selectedDeviceId: string;
	targetLanguage: string;
	onFinalOriginalText: (text: string) => void;
	onFinalTranslatedText: (text: string) => void;
	onPendingOriginalText: (text: string) => void;
	onPendingTranslatedText: (text: string) => void;
}

export const useSoniox = ({
	apiKey,
	selectedDeviceId,
	targetLanguage,
	onFinalOriginalText,
	onFinalTranslatedText,
	onPendingOriginalText,
	onPendingTranslatedText,
}: UseSonioxOptions) => {
	const [isRecording, setIsRecording] = useState(false);
	const [status, setStatus] = useState("Not connected");
	const sonioxClientRef = useRef<SonioxClient | null>(null);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			sonioxClientRef.current?.stop();
		};
	}, []);

	const startRecording = async () => {
		try {
			if (!apiKey) {
				setStatus("Error: API key is required");
				return;
			}

			setStatus("Initializing...");

			const client = new SonioxClient({ apiKey: apiKey });
			sonioxClientRef.current = client;

			await client.start({
				model: "stt-rt-preview",
				languageHints: ["ja"],
				translation: { type: "one_way", target_language: targetLanguage },
				// enableSpeakerDiarization: true,
				enableEndpointDetection: true,
				audioConstraints: selectedDeviceId
					? { deviceId: { exact: selectedDeviceId } }
					: {},

				onPartialResult: (result: SpeechToTextAPIResponse) => {
					if (!result.tokens?.length) {
						// Clear pending if no tokens
						onPendingOriginalText("");
						onPendingTranslatedText("");
						return;
					}

					const original = result.tokens.filter(
						(t) => !t.translation_status || t.translation_status === "original",
					);
					const translated = result.tokens.filter(
						(t) => t.translation_status === "translation",
					);

					// Handle final tokens (confirmed)
					const finalOriginal = original.filter((t) => t.is_final);
					const finalTranslated = translated.filter((t) => t.is_final);

					if (finalOriginal.length) {
						const text = finalOriginal.map((t) => t.text).join("");
						onFinalOriginalText(text);
					}
					if (finalTranslated.length) {
						const text = finalTranslated.map((t) => t.text).join("");
						onFinalTranslatedText(text);
					}

					// Handle non-final tokens (pending)
					const nonFinalOriginal = original.filter((t) => !t.is_final);
					const nonFinalTranslated = translated.filter((t) => !t.is_final);

					onPendingOriginalText(nonFinalOriginal.map((t) => t.text).join(""));
					onPendingTranslatedText(
						nonFinalTranslated.map((t) => t.text).join(""),
					);
				},

				onError: (status, message) => {
					console.error("Error:", status, message);
					setStatus(`Error: ${message || status}`);
				},

				onStateChange: (update) => {
					const stateMap: Record<string, string> = {
						Running: "Recording...",
						Finished: "Finished",
						Error: "Error occurred",
						RequestingMedia: "Requesting microphone...",
						OpeningWebSocket: "Connecting...",
					};
					if (stateMap[update.newState]) {
						setStatus(stateMap[update.newState]);
					}
				},
			});

			setIsRecording(true);
		} catch (error) {
			console.error("Failed to start:", error);
			setStatus(`Failed: ${error}`);
		}
	};

	const stopRecording = () => {
		sonioxClientRef.current?.stop();
		sonioxClientRef.current = null;
		setIsRecording(false);
		setStatus("Stopped");
	};

	return { isRecording, status, startRecording, stopRecording };
};
