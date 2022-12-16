import type { REST } from '@discordjs/rest';
import { range, type Awaitable } from '@discordjs/util';
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import {
	Routes,
	type APIGatewayBotInfo,
	type GatewayIdentifyProperties,
	type GatewayPresenceUpdateData,
	type RESTGetAPIGatewayBotResult,
	type GatewayIntentBits,
	type GatewaySendPayload,
} from 'discord-api-types/v10';
import type { IShardingStrategy } from '../strategies/sharding/IShardingStrategy';
import { SimpleShardingStrategy } from '../strategies/sharding/SimpleShardingStrategy.js';
import { DefaultWebSocketManagerOptions, type CompressionMethod, type Encoding } from '../utils/constants.js';
import type { WebSocketShardDestroyOptions, WebSocketShardEventsMap } from './WebSocketShard.js';

/**
 * Represents a range of shard ids
 */
export interface ShardRange {
	end: number;
	start: number;
}

/**
 * Session information for a given shard, used to resume a session
 */
export interface SessionInfo {
	/**
	 * URL to use when resuming
	 */
	resumeURL: string;
	/**
	 * The sequence number of the last message sent by the shard
	 */
	sequence: number;
	/**
	 * Session id for this shard
	 */
	sessionId: string;
	/**
	 * The total number of shards at the time of this shard identifying
	 */
	shardCount: number;
	/**
	 * The id of the shard
	 */
	shardId: number;
}

/**
 * Required options for the WebSocketManager
 */
export interface RequiredWebSocketManagerOptions {
	/**
	 * The intents to request
	 */
	intents: GatewayIntentBits;
	/**
	 * The REST instance to use for fetching gateway information
	 */
	rest: REST;
	/**
	 * The token to use for identifying with the gateway
	 */
	token: string;
}

/**
 * Optional additional configuration for the WebSocketManager
 */
export interface OptionalWebSocketManagerOptions {
	/**
	 * The compression method to use
	 *
	 * @defaultValue `null` (no compression)
	 */
	compression: CompressionMethod | null;
	/**
	 * The encoding to use
	 *
	 * @defaultValue `'json'`
	 */
	encoding: Encoding;
	/**
	 * How long to wait for a shard to connect before giving up
	 */
	handshakeTimeout: number | null;
	/**
	 * How long to wait for a shard's HELLO packet before giving up
	 */
	helloTimeout: number | null;
	/**
	 * Properties to send to the gateway when identifying
	 */
	identifyProperties: GatewayIdentifyProperties;
	/**
	 * Initial presence data to send to the gateway when identifying
	 */
	initialPresence: GatewayPresenceUpdateData | null;
	/**
	 * Value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list
	 */
	largeThreshold: number | null;
	/**
	 * How long to wait for a shard's READY packet before giving up
	 */
	readyTimeout: number | null;
	/**
	 * Function used to retrieve session information (and attempt to resume) for a given shard
	 *
	 * @example
	 * ```ts
	 * const manager = new WebSocketManager({
	 *   async retrieveSessionInfo(shardId): Awaitable<SessionInfo | null> {
	 *     // Fetch this info from redis or similar
	 *     return { sessionId: string, sequence: number };
	 *     // Return null if no information is found
	 *   },
	 * });
	 * ```
	 */
	retrieveSessionInfo(shardId: number): Awaitable<SessionInfo | null>;
	/**
	 * The total number of shards across all WebsocketManagers you intend to instantiate.
	 * Use `null` to use Discord's recommended shard count
	 */
	shardCount: number | null;
	/**
	 * The ids of the shards this WebSocketManager should manage.
	 * Use `null` to simply spawn 0 through `shardCount - 1`
	 *
	 * @example
	 * ```ts
	 * const manager = new WebSocketManager({
	 *   shardIds: [1, 3, 7], // spawns shard 1, 3, and 7, nothing else
	 * });
	 * ```
	 * @example
	 * ```ts
	 * const manager = new WebSocketManager({
	 *   shardIds: {
	 *     start: 3,
	 *     end: 6,
	 *   }, // spawns shards 3, 4, 5, and 6
	 * });
	 * ```
	 */
	shardIds: number[] | ShardRange | null;
	/**
	 * Function used to store session information for a given shard
	 */
	updateSessionInfo(shardId: number, sessionInfo: SessionInfo | null): Awaitable<void>;
	/**
	 * The gateway version to use
	 *
	 * @defaultValue `'10'`
	 */
	version: string;
}

export type WebSocketManagerOptions = OptionalWebSocketManagerOptions & RequiredWebSocketManagerOptions;

export type ManagerShardEventsMap = {
	[K in keyof WebSocketShardEventsMap]: [
		WebSocketShardEventsMap[K] extends [] ? { shardId: number } : WebSocketShardEventsMap[K][0] & { shardId: number },
	];
};

export class WebSocketManager extends AsyncEventEmitter<ManagerShardEventsMap> {
	/**
	 * The options being used by this manager
	 */
	public readonly options: WebSocketManagerOptions;

	/**
	 * Internal cache for a GET /gateway/bot result
	 */
	private gatewayInformation: {
		data: APIGatewayBotInfo;
		expiresAt: number;
	} | null = null;

	/**
	 * Internal cache for the shard ids
	 */
	private shardIds: number[] | null = null;

	/**
	 * Strategy used to manage shards
	 *
	 * @defaultValue `SimpleManagerToShardStrategy`
	 */
	private strategy: IShardingStrategy = new SimpleShardingStrategy(this);

	public constructor(options: Partial<OptionalWebSocketManagerOptions> & RequiredWebSocketManagerOptions) {
		super();
		this.options = { ...DefaultWebSocketManagerOptions, ...options };
	}

	public setStrategy(strategy: IShardingStrategy) {
		this.strategy = strategy;
		return this;
	}

	/**
	 * Fetches the gateway information from Discord - or returns it from cache if available
	 *
	 * @param force - Whether to ignore the cache and force a fresh fetch
	 */
	public async fetchGatewayInformation(force = false) {
		if (this.gatewayInformation) {
			if (this.gatewayInformation.expiresAt <= Date.now()) {
				this.gatewayInformation = null;
			} else if (!force) {
				return this.gatewayInformation.data;
			}
		}

		const data = (await this.options.rest.get(Routes.gatewayBot())) as RESTGetAPIGatewayBotResult;

		this.gatewayInformation = { data, expiresAt: Date.now() + data.session_start_limit.reset_after };
		return this.gatewayInformation.data;
	}

	/**
	 * Updates your total shard count on-the-fly, spawning shards as needed
	 *
	 * @param shardCount - The new shard count to use
	 */
	public async updateShardCount(shardCount: number | null) {
		await this.strategy.destroy({ reason: 'User is adjusting their shards' });
		this.options.shardCount = shardCount;

		const shardIds = await this.getShardIds(true);
		await this.strategy.spawn(shardIds);

		return this;
	}

	/**
	 * Yields the total number of shards across for your bot, accounting for Discord recommendations
	 */
	public async getShardCount(): Promise<number> {
		if (this.options.shardCount) {
			return this.options.shardCount;
		}

		const shardIds = await this.getShardIds();
		return Math.max(...shardIds) + 1;
	}

	/**
	 * Yields the ids of the shards this manager should manage
	 */
	public async getShardIds(force = false): Promise<number[]> {
		if (this.shardIds && !force) {
			return this.shardIds;
		}

		let shardIds: number[];
		if (this.options.shardIds) {
			if (Array.isArray(this.options.shardIds)) {
				shardIds = this.options.shardIds;
			} else {
				shardIds = range(this.options.shardIds.start, this.options.shardIds.end);
			}
		} else {
			const data = await this.fetchGatewayInformation();
			shardIds = range(0, (this.options.shardCount ?? data.shards) - 1);
		}

		this.shardIds = shardIds;
		return shardIds;
	}

	public async connect() {
		const shardCount = await this.getShardCount();

		const data = await this.fetchGatewayInformation();
		if (data.session_start_limit.remaining < shardCount) {
			throw new Error(
				`Not enough sessions remaining to spawn ${shardCount} shards; only ${
					data.session_start_limit.remaining
				} remaining; resets at ${new Date(Date.now() + data.session_start_limit.reset_after).toISOString()}`,
			);
		}

		// First, make sure all our shards are spawned
		await this.updateShardCount(shardCount);
		await this.strategy.connect();
	}

	public destroy(options?: Omit<WebSocketShardDestroyOptions, 'recover'>) {
		return this.strategy.destroy(options);
	}

	public send(shardId: number, payload: GatewaySendPayload) {
		return this.strategy.send(shardId, payload);
	}
}
