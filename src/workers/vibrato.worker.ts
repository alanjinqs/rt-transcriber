import initWasm, { init_with_dict as wasmInitWithDict, tokenize as wasmTokenize } from "../vibrato-wasm/vibrato_simple_wasm.js";

const DEBUG = true;
const log = (...args: unknown[]) => {
	if (DEBUG) console.log("[vibrato-worker]", ...args);
};

export interface VibratoToken {
	surface: string;
	pos: string;
	pron: string;
}

interface RawToken {
	surface: string;
	feature: string;
}

function parseFeature(raw: RawToken): VibratoToken {
	const parts = raw.feature.split(",");
	return {
		surface: raw.surface,
		pos: parts[0] || "",
		pron: parts[9] || "",
	};
}

interface InitMessage {
	type: "init";
	wasmUrl: string;
	dictData: Uint8Array;
}

interface TokenizeMessage {
	type: "tokenize";
	id: number;
	text: string;
}

type WorkerMessage = InitMessage | TokenizeMessage;

interface ReadyMessage {
	type: "ready";
}

interface TokensMessage {
	type: "tokens";
	id: number;
	tokens: VibratoToken[];
}

interface ErrorMessage {
	type: "error";
	message: string;
}

type WorkerResponse = ReadyMessage | TokensMessage | ErrorMessage;

let isInitialized = false;

log("Worker script loaded");

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const message = event.data;
	log("Received message:", message.type);
	
	if (message.type === "init") {
		try {
			const { wasmUrl, dictData } = message;
			log("Starting WASM initialization with URL:", wasmUrl);
			
			log("Calling initWasm()...");
			const startTime = performance.now();
			await initWasm(wasmUrl);
			const wasmLoadTime = performance.now() - startTime;
			log(`initWasm() completed in ${wasmLoadTime.toFixed(0)}ms`);
			
			log("Dictionary data received, size:", dictData.length, "bytes");
			
			log("Calling wasmInitWithDict() to decompress and load dictionary...");
			const initStartTime = performance.now();
			wasmInitWithDict(dictData);
			const initTime = performance.now() - initStartTime;
			log(`wasmInitWithDict() completed in ${initTime.toFixed(0)}ms`);
			
			isInitialized = true;
			log("Initialization complete, sending ready message");
			const response: WorkerResponse = { type: "ready" };
			self.postMessage(response);
		} catch (error) {
			log("ERROR during initialization:", error);
			const errorMessage = error instanceof Error 
				? `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`
				: String(error);
			log("Error details:", errorMessage);
			const response: WorkerResponse = {
				type: "error",
				message: error instanceof Error ? error.message : "Unknown error",
			};
			self.postMessage(response);
		}
		return;
	}

	if (message.type === "tokenize") {
		if (!isInitialized) {
			log("ERROR: Tokenize called but not initialized");
			const response: WorkerResponse = {
				type: "error",
				message: "Tokenizer not initialized",
			};
			self.postMessage(response);
			return;
		}
		try {
			log("Tokenizing text:", message.text.slice(0, 50) + (message.text.length > 50 ? "..." : ""));
			const rawTokens = wasmTokenize(message.text) as RawToken[];
			const tokens = rawTokens.map((t) => parseFeature(t));
			log("Tokenization result:", tokens.length, "tokens");
			const response: WorkerResponse = {
				type: "tokens",
				id: message.id,
				tokens,
			};
			self.postMessage(response);
		} catch (error) {
			log("ERROR during tokenization:", error);
			const response: WorkerResponse = {
				type: "error",
				message: error instanceof Error ? error.message : "Unknown error",
			};
			self.postMessage(response);
		}
	}
};
