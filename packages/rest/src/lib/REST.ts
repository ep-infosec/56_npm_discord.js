import { EventEmitter } from 'node:events';
import type { Collection } from '@discordjs/collection';
import type { request, Dispatcher } from 'undici';
import { CDN } from './CDN.js';
import {
	RequestManager,
	RequestMethod,
	type HashData,
	type HandlerRequestData,
	type InternalRequest,
	type RequestData,
	type RouteLike,
} from './RequestManager.js';
import type { IHandler } from './handlers/IHandler.js';
import { DefaultRestOptions, RESTEvents } from './utils/constants.js';
import { parseResponse } from './utils/utils.js';

/**
 * Options to be passed when creating the REST instance
 */
export interface RESTOptions {
	/**
	 * The agent to set globally
	 */
	agent: Dispatcher;
	/**
	 * The base api path, without version
	 *
	 * @defaultValue `'https://discord.com/api'`
	 */
	api: string;
	/**
	 * The authorization prefix to use for requests, useful if you want to use
	 * bearer tokens
	 *
	 * @defaultValue `'Bot'`
	 */
	authPrefix: 'Bearer' | 'Bot';
	/**
	 * The cdn path
	 *
	 * @defaultValue 'https://cdn.discordapp.com'
	 */
	cdn: string;
	/**
	 * How many requests to allow sending per second (Infinity for unlimited, 50 for the standard global limit used by Discord)
	 *
	 * @defaultValue `50`
	 */
	globalRequestsPerSecond: number;
	/**
	 * The amount of time in milliseconds that passes between each hash sweep. (defaults to 1h)
	 *
	 * @defaultValue `3_600_000`
	 */
	handlerSweepInterval: number;
	/**
	 * The maximum amount of time a hash can exist in milliseconds without being hit with a request (defaults to 24h)
	 *
	 * @defaultValue `86_400_000`
	 */
	hashLifetime: number;
	/**
	 * The amount of time in milliseconds that passes between each hash sweep. (defaults to 4h)
	 *
	 * @defaultValue `14_400_000`
	 */
	hashSweepInterval: number;
	/**
	 * Additional headers to send for all API requests
	 *
	 * @defaultValue `{}`
	 */
	headers: Record<string, string>;
	/**
	 * The number of invalid REST requests (those that return 401, 403, or 429) in a 10 minute window between emitted warnings (0 for no warnings).
	 * That is, if set to 500, warnings will be emitted at invalid request number 500, 1000, 1500, and so on.
	 *
	 * @defaultValue `0`
	 */
	invalidRequestWarningInterval: number;
	/**
	 * The extra offset to add to rate limits in milliseconds
	 *
	 * @defaultValue `50`
	 */
	offset: number;
	/**
	 * Determines how rate limiting and pre-emptive throttling should be handled.
	 * When an array of strings, each element is treated as a prefix for the request route
	 * (e.g. `/channels` to match any route starting with `/channels` such as `/channels/:id/messages`)
	 * for which to throw {@link RateLimitError}s. All other request routes will be queued normally
	 *
	 * @defaultValue `null`
	 */
	rejectOnRateLimit: RateLimitQueueFilter | string[] | null;
	/**
	 * The number of retries for errors with the 500 code, or errors
	 * that timeout
	 *
	 * @defaultValue `3`
	 */
	retries: number;
	/**
	 * The time to wait in milliseconds before a request is aborted
	 *
	 * @defaultValue `15_000`
	 */
	timeout: number;
	/**
	 * Extra information to add to the user agent
	 *
	 * @defaultValue `Node.js ${process.version}`
	 */
	userAgentAppendix: string;
	/**
	 * The version of the API to use
	 *
	 * @defaultValue `'10'`
	 */
	version: string;
}

/**
 * Data emitted on `RESTEvents.RateLimited`
 */
export interface RateLimitData {
	/**
	 * Whether the rate limit that was reached was the global limit
	 */
	global: boolean;
	/**
	 * The bucket hash for this request
	 */
	hash: string;
	/**
	 * The amount of requests we can perform before locking requests
	 */
	limit: number;
	/**
	 * The major parameter of the route
	 *
	 * For example, in `/channels/x`, this will be `x`.
	 * If there is no major parameter (e.g: `/bot/gateway`) this will be `global`.
	 */
	majorParameter: string;
	/**
	 * The HTTP method being performed
	 */
	method: string;
	/**
	 * The route being hit in this request
	 */
	route: string;
	/**
	 * The time, in milliseconds, until the request-lock is reset
	 */
	timeToReset: number;
	/**
	 * The full URL for this request
	 */
	url: string;
}

/**
 * A function that determines whether the rate limit hit should throw an Error
 */
export type RateLimitQueueFilter = (rateLimitData: RateLimitData) => Promise<boolean> | boolean;

export interface APIRequest {
	/**
	 * The data that was used to form the body of this request
	 */
	data: HandlerRequestData;
	/**
	 * The HTTP method used in this request
	 */
	method: string;
	/**
	 * Additional HTTP options for this request
	 */
	options: RequestOptions;
	/**
	 * The full path used to make the request
	 */
	path: RouteLike;
	/**
	 * The number of times this request has been attempted
	 */
	retries: number;
	/**
	 * The API route identifying the ratelimit for this request
	 */
	route: string;
}

export interface InvalidRequestWarningData {
	/**
	 * Number of invalid requests that have been made in the window
	 */
	count: number;
	/**
	 * Time in milliseconds remaining before the count resets
	 */
	remainingTime: number;
}

export interface RestEvents {
	handlerSweep: [sweptHandlers: Collection<string, IHandler>];
	hashSweep: [sweptHashes: Collection<string, HashData>];
	invalidRequestWarning: [invalidRequestInfo: InvalidRequestWarningData];
	newListener: [name: string, listener: (...args: any) => void];
	rateLimited: [rateLimitInfo: RateLimitData];
	removeListener: [name: string, listener: (...args: any) => void];
	response: [request: APIRequest, response: Dispatcher.ResponseData];
	restDebug: [info: string];
}

export interface REST {
	emit: (<K extends keyof RestEvents>(event: K, ...args: RestEvents[K]) => boolean) &
		(<S extends string | symbol>(event: Exclude<S, keyof RestEvents>, ...args: any[]) => boolean);

	off: (<K extends keyof RestEvents>(event: K, listener: (...args: RestEvents[K]) => void) => this) &
		(<S extends string | symbol>(event: Exclude<S, keyof RestEvents>, listener: (...args: any[]) => void) => this);

	on: (<K extends keyof RestEvents>(event: K, listener: (...args: RestEvents[K]) => void) => this) &
		(<S extends string | symbol>(event: Exclude<S, keyof RestEvents>, listener: (...args: any[]) => void) => this);

	once: (<K extends keyof RestEvents>(event: K, listener: (...args: RestEvents[K]) => void) => this) &
		(<S extends string | symbol>(event: Exclude<S, keyof RestEvents>, listener: (...args: any[]) => void) => this);

	removeAllListeners: (<K extends keyof RestEvents>(event?: K) => this) &
		(<S extends string | symbol>(event?: Exclude<S, keyof RestEvents>) => this);
}

export type RequestOptions = Exclude<Parameters<typeof request>[1], undefined>;

export class REST extends EventEmitter {
	public readonly cdn: CDN;

	public readonly requestManager: RequestManager;

	public constructor(options: Partial<RESTOptions> = {}) {
		super();
		this.cdn = new CDN(options.cdn ?? DefaultRestOptions.cdn);
		this.requestManager = new RequestManager(options)
			.on(RESTEvents.Debug, this.emit.bind(this, RESTEvents.Debug))
			.on(RESTEvents.RateLimited, this.emit.bind(this, RESTEvents.RateLimited))
			.on(RESTEvents.InvalidRequestWarning, this.emit.bind(this, RESTEvents.InvalidRequestWarning))
			.on(RESTEvents.HashSweep, this.emit.bind(this, RESTEvents.HashSweep));

		this.on('newListener', (name, listener) => {
			if (name === RESTEvents.Response) this.requestManager.on(name, listener);
		});
		this.on('removeListener', (name, listener) => {
			if (name === RESTEvents.Response) this.requestManager.off(name, listener);
		});
	}

	/**
	 * Gets the agent set for this instance
	 */
	public getAgent() {
		return this.requestManager.agent;
	}

	/**
	 * Sets the default agent to use for requests performed by this instance
	 *
	 * @param agent - Sets the agent to use
	 */
	public setAgent(agent: Dispatcher) {
		this.requestManager.setAgent(agent);
		return this;
	}

	/**
	 * Sets the authorization token that should be used for requests
	 *
	 * @param token - The authorization token to use
	 */
	public setToken(token: string) {
		this.requestManager.setToken(token);
		return this;
	}

	/**
	 * Runs a get request from the api
	 *
	 * @param fullRoute - The full route to query
	 * @param options - Optional request options
	 */
	public async get(fullRoute: RouteLike, options: RequestData = {}) {
		return this.request({ ...options, fullRoute, method: RequestMethod.Get });
	}

	/**
	 * Runs a delete request from the api
	 *
	 * @param fullRoute - The full route to query
	 * @param options - Optional request options
	 */
	public async delete(fullRoute: RouteLike, options: RequestData = {}) {
		return this.request({ ...options, fullRoute, method: RequestMethod.Delete });
	}

	/**
	 * Runs a post request from the api
	 *
	 * @param fullRoute - The full route to query
	 * @param options - Optional request options
	 */
	public async post(fullRoute: RouteLike, options: RequestData = {}) {
		return this.request({ ...options, fullRoute, method: RequestMethod.Post });
	}

	/**
	 * Runs a put request from the api
	 *
	 * @param fullRoute - The full route to query
	 * @param options - Optional request options
	 */
	public async put(fullRoute: RouteLike, options: RequestData = {}) {
		return this.request({ ...options, fullRoute, method: RequestMethod.Put });
	}

	/**
	 * Runs a patch request from the api
	 *
	 * @param fullRoute - The full route to query
	 * @param options - Optional request options
	 */
	public async patch(fullRoute: RouteLike, options: RequestData = {}) {
		return this.request({ ...options, fullRoute, method: RequestMethod.Patch });
	}

	/**
	 * Runs a request from the api
	 *
	 * @param options - Request options
	 */
	public async request(options: InternalRequest) {
		const response = await this.raw(options);
		return parseResponse(response);
	}

	/**
	 * Runs a request from the API, yielding the raw Response object
	 *
	 * @param options - Request options
	 */
	public async raw(options: InternalRequest) {
		return this.requestManager.queueRequest(options);
	}
}
