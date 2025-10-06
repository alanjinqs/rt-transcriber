import { useState } from "react";

interface ControlPanelProps {
	isRecording: boolean;
	status: string;
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
}

export const ControlPanel = ({
	isRecording,
	status,
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
}: ControlPanelProps) => {
	const [showApiKeyInput, setShowApiKeyInput] = useState(false);
	const [showSettings, setShowSettings] = useState(true);

	const saveApiKey = () => {
		localStorage.setItem("soniox_api_key", apiKey);
		setShowApiKeyInput(false);
	};

	const clearApiKey = () => {
		setApiKey("");
		localStorage.removeItem("soniox_api_key");
	};

	return (
		<div className="bg-white rounded-lg shadow mb-6 shrink-0">
			{/* Header with collapse button */}
			<div className="p-6 pb-4 flex items-center justify-between">
				<h2 className="text-lg font-semibold text-gray-800">Control Panel</h2>
				<button
					type="button"
					onClick={() => setShowSettings(!showSettings)}
					className="text-gray-600 hover:text-gray-800 transition-colors"
				>
					<svg
						className={`w-5 h-5 transition-transform ${
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
				<div className="px-6 pb-4">
					<div className="mb-4">
						<label
							htmlFor="api-key"
							className="block text-sm font-semibold text-gray-700 mb-2"
						>
							Soniox API Key:
						</label>
						{!apiKey && (
							<p className="text-sm text-red-500 mb-2">
								No API key set. You must set an Soniox API key to use the app.
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
										className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									<button
										type="button"
										onClick={saveApiKey}
										className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold"
									>
										Save
									</button>
									<button
										type="button"
										onClick={() => setShowApiKeyInput(false)}
										className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold"
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
										className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
									/>
									<button
										type="button"
										onClick={() => setShowApiKeyInput(true)}
										disabled={isRecording}
										className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={clearApiKey}
										disabled={isRecording}
										className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
									>
										Clear
									</button>
								</>
							)}
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 mb-4">
						<div>
							<label
								htmlFor="microphone-select"
								className="block text-sm font-semibold text-gray-700 mb-2"
							>
								Microphone:
							</label>
							<select
								id="microphone-select"
								value={selectedDeviceId}
								onChange={(e) => setSelectedDeviceId(e.target.value)}
								disabled={isRecording}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								{audioDevices.map((device) => (
									<option key={device.deviceId} value={device.deviceId}>
										{device.label ||
											`Microphone ${device.deviceId.slice(0, 8)}`}
									</option>
								))}
							</select>
						</div>

						<div>
							<label
								htmlFor="target-language"
								className="block text-sm font-semibold text-gray-700 mb-2"
							>
								Target Language:
							</label>
							<select
								id="target-language"
								value={targetLanguage}
								onChange={(e) => setTargetLanguage(e.target.value)}
								disabled={isRecording}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="en">English</option>
								<option value="zh">Chinese (中文)</option>
								<option value="ko">Korean (한국어)</option>
							</select>
						</div>
					</div>
					<div>
						<span className="block text-sm opacity-50 mb-2">
							Remember to disable Chrome-wide echo cancellation
						</span>
					</div>
				</div>
			)}

			{/* Control buttons - always visible */}
			<div className="px-6 pb-6">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={isRecording ? stopRecording : startRecording}
						className={`px-6 py-3 rounded-lg font-semibold ${
							isRecording
								? "bg-red-500 hover:bg-red-600 text-white"
								: "bg-blue-500 hover:bg-blue-600 text-white"
						}`}
					>
						{isRecording ? "Stop" : "Start Recording"}
					</button>
					<button
						type="button"
						onClick={clearAll}
						className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold"
					>
						Clear
					</button>
					{isPiPSupported && (
						<button
							type="button"
							onClick={pipWindow ? closePiP : openPiP}
							className={`px-6 py-3 rounded-lg font-semibold ${
								pipWindow
									? "bg-orange-500 hover:bg-orange-600 text-white"
									: "bg-purple-500 hover:bg-purple-600 text-white"
							}`}
						>
							{pipWindow ? "Close PiP" : "Open PiP"}
						</button>
					)}
					<div className="ml-auto">
						<span className="text-gray-600">Status: </span>
						<span
							className={`font-semibold ${
								isRecording ? "text-green-600" : "text-gray-500"
							}`}
						>
							{status}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};
