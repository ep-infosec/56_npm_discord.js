import { makeURLSearchParams, type REST } from '@discordjs/rest';
import { Routes, type RESTGetAPIInviteQuery, type RESTGetAPIInviteResult } from 'discord-api-types/v10';

export class InvitesAPI {
	public constructor(private readonly rest: REST) {}

	/**
	 * Fetches an invite
	 *
	 * @see {@link https://discord.com/developers/docs/resources/invite#get-invite}
	 * @param code - The invite code
	 */
	public async get(code: string, options: RESTGetAPIInviteQuery = {}) {
		return this.rest.get(Routes.invite(code), {
			query: makeURLSearchParams(options),
		}) as Promise<RESTGetAPIInviteResult>;
	}

	/**
	 * Deletes an invite
	 *
	 * @see {@link https://discord.com/developers/docs/resources/invite#delete-invite}
	 * @param code - The invite code
	 * @param reason - The reason for deleting the invite
	 */
	public async delete(code: string, reason?: string) {
		await this.rest.delete(Routes.invite(code), { reason });
	}
}
