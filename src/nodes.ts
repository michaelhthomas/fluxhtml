export const DOCUMENT_NODE = 0;
export const ELEMENT_NODE = 1;
export const TEXT_NODE = 2;
export const COMMENT_NODE = 3;
export const DOCTYPE_NODE = 4;

export type NodeType =
	| typeof DOCUMENT_NODE
	| typeof ELEMENT_NODE
	| typeof TEXT_NODE
	| typeof COMMENT_NODE
	| typeof DOCTYPE_NODE;

export type Location = {
	start: number;
	end: number;
};
