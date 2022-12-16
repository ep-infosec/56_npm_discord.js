import type { REST } from '@discordjs/rest';
import { Routes, type GetAPIVoiceRegionsResult } from 'discord-api-types/v10';

export class VoiceAPI {
	public constructor(private readonly rest: REST) {}

	/**
	 * Fetches all voice regions
	 *
	 * @see {@link https://discord.com/developers/docs/resources/voice#list-voice-regions}
	 */
	public async getVoiceRegions() {
		return this.rest.get(Routes.voiceRegions()) as Promise<GetAPIVoiceRegionsResult>;
	}
}
