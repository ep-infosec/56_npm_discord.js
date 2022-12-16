export * from './collection.js';

/**
 * The {@link https://github.com/discordjs/discord.js/blob/main/packages/collection/#readme | @discordjs/collection} version
 * that you are currently using.
 */
// This needs to explicitly be `string` so it is not typed as a "const string" that gets injected by esbuild
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const version: string = '[VI]{{inject}}[/VI]';
