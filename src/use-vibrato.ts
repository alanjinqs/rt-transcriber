import { useEffect, useRef, useState } from "react";

const DEBUG = true;
const log = (...args: unknown[]) => {
	if (DEBUG) console.log("[use-vibrato]", ...args);
};

export interface VibratoToken {
	surface: string;
	pos: string;
	pron: string;
}

interface VibratoWorkerInitMessage {
	type: "init";
	wasmUrl: string;
	dictUrl: string;
}

interface VibratoWorkerTokenizeMessage {
	type: "tokenize";
	id: number;
	text: string;
}

interface VibratoWorkerReadyMessage {
	type: "ready";
}

interface VibratoWorkerTokensMessage {
	type: "tokens";
	id: number;
	tokens: VibratoToken[];
}

interface VibratoWorkerErrorMessage {
	type: "error";
	message: string;
}

type VibratoWorkerResponse =
	| VibratoWorkerReadyMessage
	| VibratoWorkerTokensMessage
	| VibratoWorkerErrorMessage;

const DEFAULT_WASM_URL = "/vibrato/vibrato_simple_wasm_bg.wasm";
const DEFAULT_DICT_URL = "/vibrato/system.dic";

export const useVibrato = () => {
	const workerRef = useRef<Worker | null>(null);
	const pendingRequests = useRef(
		new Map<number, (tokens: VibratoToken[]) => void>(),
	);
	const [status, setStatus] = useState("Not initialized");
	const [isReady, setIsReady] = useState(false);
	const requestIdRef = useRef(0);
	const readyPromiseRef = useRef<Promise<void> | null>(null);
	const readyResolveRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		log("Creating Vibrato worker...");
		const worker = new Worker(
			new URL("./workers/vibrato.worker.ts", import.meta.url),
			{ type: "module" },
		);
		workerRef.current = worker;
		log("Worker created");

		readyPromiseRef.current = new Promise((resolve) => {
			readyResolveRef.current = resolve;
		});

		worker.onmessage = (event: MessageEvent<VibratoWorkerResponse>) => {
			const message = event.data;
			log("Received message from worker:", message.type);
			
			if (message.type === "ready") {
				log("Worker is ready!");
				setIsReady(true);
				setStatus("Ready");
				readyResolveRef.current?.();
				readyResolveRef.current = null;
				return;
			}
			if (message.type === "tokens") {
				log("Received tokens for id:", message.id, "count:", message.tokens.length);
				const resolver = pendingRequests.current.get(message.id);
				if (resolver) {
					resolver(message.tokens);
					pendingRequests.current.delete(message.id);
				}
				return;
			}
			if (message.type === "error") {
				log("Worker error:", message.message);
				setStatus(`Error: ${message.message}`);
			}
		};

		worker.onerror = (event) => {
			log("Worker onerror event:", event.message, event);
			setStatus(`Worker error: ${event.message}`);
		};

		setStatus("Loading dictionary...");
		log("Sending init message with wasmUrl:", DEFAULT_WASM_URL, "dictUrl:", DEFAULT_DICT_URL);
		const initMessage: VibratoWorkerInitMessage = {
			type: "init",
			wasmUrl: DEFAULT_WASM_URL,
			dictUrl: DEFAULT_DICT_URL,
		};
		worker.postMessage(initMessage);

		return () => {
			log("Terminating worker");
			worker.terminate();
			workerRef.current = null;
			pendingRequests.current.clear();
		};
	}, []);

	const tokenize = async (text: string): Promise<VibratoToken[]> => {
		log("tokenize() called, isReady:", isReady, "text:", text.slice(0, 30));
		if (!workerRef.current) {
			log("tokenize() - no worker ref, returning empty");
			return [];
		}
		if (!isReady && readyPromiseRef.current) {
			log("tokenize() - waiting for ready...");
			await readyPromiseRef.current;
			log("tokenize() - ready promise resolved");
		}
		if (!text.trim()) {
			log("tokenize() - empty text, returning empty");
			return [];
		}

		const id = requestIdRef.current++;
		const message: VibratoWorkerTokenizeMessage = {
			type: "tokenize",
			id,
			text,
		};
		log("tokenize() - sending message id:", id);
		const tokens = await new Promise<VibratoToken[]>((resolve) => {
			pendingRequests.current.set(id, resolve);
			workerRef.current?.postMessage(message);
		});
		log("tokenize() - received tokens:", tokens.length);
		return tokens;
	};

	return { tokenize, status, isReady };
};
