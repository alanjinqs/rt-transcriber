import { useState, useRef } from "react";
import type { AudioSource } from "../App";

interface ControlPanelProps {
	isRecording: boolean;
	status: string;
	vibratoStatus: string;
	startRecording: () => void;
	stopRecording: () => void;
	clearAll: () => void;
	pipWindow: Window | null;
	openPiP: () => void;
	closePiP: () => void;
	isPiPSupported: boolean;
	audioDevices: MediaDeviceInfo[];
	selectedDeviceId: string;
	setSelectedDeviceId: (deviceId: string) => void;
	apiKey: string;
	setApiKey: (key: string) => void;
	targetLanguage: string;
	setTargetLanguage: (lang: string) => void;
	audioSource: AudioSource;
	setAudioSource: (source: AudioSource) => void;
	hasDictionary: boolean;
	onLoadDictionary: (file: File) => void;
}

export const ControlPanel = ({
	isRecording,
	status,
	vibratoStatus,
	startRecording,
	stopRecording,
	clearAll,
	pipWindow,
	openPiP,
	closePiP,
	isPiPSupported,
	audioDevices,
	selectedDeviceId,
	setSelectedDeviceId,
	apiKey,
	setApiKey,
	targetLanguage,
	setTargetLanguage,
	audioSource,
	setAudioSource,
	hasDictionary,
	onLoadDictionary,
}: ControlPanelProps) => {
	const [showApiKeyInput, setShowApiKeyInput] = useState(false);
	const [showSettings, setShowSettings] = useState(true);
	const dictInputRef = useRef<HTMLInputElement>(null);

	const saveApiKey = () => {
		localStorage.setItem("soniox_api_key", apiKey);
		setShowApiKeyInput(false);
	};

	const clearApiKey = () => {
		setApiKey("");
		localStorage.removeItem("soniox_api_key");
	};

	return (
		<div className="bg-card border border-border mb-4 shrink-0">
			{/* Header with collapse button */}
			<div className="px-4 py-3 flex items-center justify-between border-b border-border">
				<h2 className="text-sm font-medium text-foreground">Control Panel</h2>
				<button
					type="button"
					onClick={() => setShowSettings(!showSettings)}
					className="text-muted-foreground hover:text-foreground transition-colors"
				>
					<svg
						className={`w-4 h-4 transition-transform ${
							showSettings ? "rotate-180" : ""
						}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-label="Toggle settings"
					>
						<title>Toggle settings</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>
			</div>

			{/* Collapsible settings content */}
			{showSettings && (
				<div className="p-4 space-y-4">
					{/* API Key Section */}
					<div>
						<label
							htmlFor="api-key"
							className="block text-xs font-medium text-foreground mb-1.5"
						>
							Soniox API Key
						</label>
						{!apiKey && (
							<p className="text-xs text-destructive mb-1.5">
								No API key set. Required to use the app.
							</p>
						)}
						<div className="flex gap-2">
							{showApiKeyInput ? (
								<>
									<input
										id="api-key"
										type="text"
										value={apiKey}
										onChange={(e) => setApiKey(e.target.value)}
										placeholder="Enter your Soniox API key"
										className="flex-1 h-8 px-3 text-sm bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring"
									/>
									<button
										type="button"
										onClick={saveApiKey}
										className="h-8 px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
									>
										Save
									</button>
									<button
										type="button"
										onClick={() => setShowApiKeyInput(false)}
										className="h-8 px-3 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
									>
										Cancel
									</button>
								</>
							) : (
								<>
									<input
										id="api-key"
										type="password"
										value={apiKey}
										readOnly
										placeholder="No API key set"
										className="flex-1 h-8 px-3 text-sm bg-muted border border-input cursor-default"
									/>
									<button
										type="button"
										onClick={() => setShowApiKeyInput(true)}
										disabled={isRecording}
										className="h-8 px-3 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={clearApiKey}
										disabled={isRecording}
										className="h-8 px-3 text-xs font-medium bg-destructive text-primary-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Clear
									</button>
								</>
							)}
						</div>
					</div>

					{/* Audio Source Section */}
					<div>
						<div className="block text-xs font-medium text-foreground mb-1.5">
							Audio Source
						</div>
						<div className="flex gap-4">
							<label className="flex items-center gap-2 cursor-pointer text-sm">
								<input
									type="radio"
									name="audioSource"
									value="screen"
									checked={audioSource === "screen"}
									onChange={() => setAudioSource("screen")}
									disabled={isRecording}
									className="w-3.5 h-3.5 accent-primary disabled:cursor-not-allowed"
								/>
								<span className="text-foreground">
									Screen Share (Tab Audio)
								</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer text-sm">
								<input
									type="radio"
									name="audioSource"
									value="microphone"
									checked={audioSource === "microphone"}
									onChange={() => setAudioSource("microphone")}
									disabled={isRecording}
									className="w-3.5 h-3.5 accent-primary disabled:cursor-not-allowed"
								/>
								<span className="text-foreground">Microphone</span>
							</label>
						</div>
						{audioSource === "screen" && (
							<p className="text-xs text-muted-foreground mt-1">
								Share a Chrome tab to capture its audio. Check "Share tab audio"
								in the dialog.
							</p>
						)}
					</div>

					{/* Microphone & Language Selection */}
					<div className="grid grid-cols-2 gap-4">
						{audioSource === "microphone" && (
							<div>
								<label
									htmlFor="microphone-select"
									className="block text-xs font-medium text-foreground mb-1.5"
								>
									Microphone
								</label>
								<select
									id="microphone-select"
									value={selectedDeviceId}
									onChange={(e) => setSelectedDeviceId(e.target.value)}
									disabled={isRecording}
									className="w-full h-8 px-3 text-sm bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed"
								>
									{audioDevices.map((device) => (
										<option key={device.deviceId} value={device.deviceId}>
											{device.label ||
												`Microphone ${device.deviceId.slice(0, 8)}`}
										</option>
									))}
								</select>
							</div>
						)}

						<div className={audioSource === "screen" ? "col-span-2" : ""}>
							<label
								htmlFor="target-language"
								className="block text-xs font-medium text-foreground mb-1.5"
							>
								Target Language
							</label>
							<select
								id="target-language"
								value={targetLanguage}
								onChange={(e) => setTargetLanguage(e.target.value)}
								disabled={isRecording}
								className="w-full h-8 px-3 text-sm bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed"
							>
								<option value="en">English</option>
								<option value="zh">Chinese (中文)</option>
								<option value="ko">Korean (한국어)</option>
							</select>
						</div>
					</div>

					{/* Dictionary File Section */}
					<div>
						<label
							htmlFor="dict-file"
							className="block text-xs font-medium text-foreground mb-1.5"
						>
							Vibrato Dictionary (Optional)
						</label>
						<div className="flex gap-2 items-center">
							<input
								ref={dictInputRef}
								id="dict-file"
								type="file"
								accept=".dic,.bin"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) {
										onLoadDictionary(file);
									}
								}}
								disabled={isRecording}
								className="hidden"
							/>
							<button
								type="button"
								onClick={() => dictInputRef.current?.click()}
								disabled={isRecording}
								className="h-8 px-3 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{hasDictionary ? "Change Dictionary" : "Load Dictionary"}
							</button>
							<span className="text-xs text-muted-foreground">
								{hasDictionary ? vibratoStatus : "No dictionary loaded - furigana disabled"}
							</span>
						</div>
					</div>

				</div>
			)}

			{/* Control buttons - always visible */}
			<div className="px-4 py-3 border-t border-border">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={isRecording ? stopRecording : startRecording}
						className={`h-8 px-4 text-xs font-medium transition-colors ${
							isRecording
								? "bg-destructive text-primary-foreground hover:bg-destructive/90"
								: "bg-primary text-primary-foreground hover:bg-primary/90"
						}`}
					>
						{isRecording ? "Stop" : "Start Recording"}
					</button>
					<button
						type="button"
						onClick={clearAll}
						className="h-8 px-4 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
					>
						Clear
					</button>
					{isPiPSupported && (
						<button
							type="button"
							onClick={pipWindow ? closePiP : openPiP}
							className="h-8 px-4 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
						>
							{pipWindow ? "Close PiP" : "Open PiP"}
						</button>
					)}
					<div className="ml-auto flex items-center gap-4">
						<span className="text-xs text-muted-foreground">
							<span className="font-medium">STT:</span>{" "}
							<span className={isRecording ? "text-primary" : ""}>{status}</span>
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};
