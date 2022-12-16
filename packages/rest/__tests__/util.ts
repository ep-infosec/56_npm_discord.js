import { DefaultRestOptions } from '../src/index.js';

export function genPath(path: `/${string}`) {
	return `/api/v${DefaultRestOptions.version}${path}` as const;
}

export function jsonHeaders(headers: Record<string, string> = {}) {
	return {
		headers: {
			'content-type': 'application/json',
			...headers,
		},
	};
}
