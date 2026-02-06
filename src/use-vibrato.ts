import { useEffect, useRef, useState, useCallback } from "react";
import type {
	VibratoToken,
	VibratoWorkerInitMessage,
	VibratoWorkerTokenizeMessage,
	VibratoWorkerResponse,
} from "./types/vibrato";

const DEBUG = import.meta.env.DEV;
const log = (...args: unknown[]) => {
	if (DEBUG) console.log("[use-vibrato]", ...args);
};

export type { VibratoToken };

const DEFAULT_WASM_URL = "/vibrato/vibrato_simple_wasm_bg.wasm";

export const useVibrato = () => {
	const workerRef = useRef<Worker | null>(null);
	const pendingRequests = useRef(
		new Map<number, (tokens: VibratoToken[]) => void>(),
	);
	const [status, setStatus] = useState("No dictionary loaded");
	const [isReady, setIsReady] = useState(false);
	const [dictFile, setDictFile] = useState<File | null>(null);
	const requestIdRef = useRef(0);
	const readyPromiseRef = useRef<Promise<void> | null>(null);
	const readyResolveRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		if (!dictFile) {
			setStatus("No dictionary loaded");
			setIsReady(false);
			return;
		}

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
		dictFile.arrayBuffer().then((buffer) => {
			const dictData = new Uint8Array(buffer);
			log("Sending init message with wasmUrl:", DEFAULT_WASM_URL, "dictData size:", dictData.length);
			const initMessage: VibratoWorkerInitMessage = {
				type: "init",
				wasmUrl: DEFAULT_WASM_URL,
				dictData,
			};
			worker.postMessage(initMessage);
		}).catch((error) => {
			log("Failed to read dictionary file:", error);
			setStatus(`Failed to read dictionary: ${error.message}`);
		});

		const currentPendingRequests = pendingRequests.current;
		return () => {
			log("Terminating worker");
			worker.terminate();
			workerRef.current = null;
			currentPendingRequests.clear();
			setIsReady(false);
		};
	}, [dictFile]);

	const tokenize = useCallback(async (text: string): Promise<VibratoToken[]> => {
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
	}, [isReady]);

	const loadDictionary = useCallback((file: File) => {
		setDictFile(file);
	}, []);

	const clearDictionary = useCallback(() => {
		setDictFile(null);
	}, []);

	return { tokenize, status, isReady, loadDictionary, clearDictionary, hasDictionary: !!dictFile };
};
