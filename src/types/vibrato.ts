export interface VibratoToken {
	surface: string;
	pos: string;
	pron: string;
}

export interface VibratoWorkerInitMessage {
	type: "init";
	wasmUrl: string;
	dictData: Uint8Array;
}

export interface VibratoWorkerTokenizeMessage {
	type: "tokenize";
	id: number;
	text: string;
}

export type VibratoWorkerMessage =
	| VibratoWorkerInitMessage
	| VibratoWorkerTokenizeMessage;

export interface VibratoWorkerReadyResponse {
	type: "ready";
}

export interface VibratoWorkerTokensResponse {
	type: "tokens";
	id: number;
	tokens: VibratoToken[];
}

export interface VibratoWorkerErrorResponse {
	type: "error";
	message: string;
}

export type VibratoWorkerResponse =
	| VibratoWorkerReadyResponse
	| VibratoWorkerTokensResponse
	| VibratoWorkerErrorResponse;
