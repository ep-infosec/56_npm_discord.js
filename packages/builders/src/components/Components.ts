import { ComponentType, type APIMessageComponent, type APIModalComponent } from 'discord-api-types/v10';
import {
	ActionRowBuilder,
	type AnyComponentBuilder,
	type MessageComponentBuilder,
	type ModalComponentBuilder,
} from './ActionRow.js';
import { ComponentBuilder } from './Component.js';
import { ButtonBuilder } from './button/Button.js';
import { ChannelSelectMenuBuilder } from './selectMenu/ChannelSelectMenu.js';
import { MentionableSelectMenuBuilder } from './selectMenu/MentionableSelectMenu.js';
import { RoleSelectMenuBuilder } from './selectMenu/RoleSelectMenu.js';
import { StringSelectMenuBuilder } from './selectMenu/StringSelectMenu.js';
import { UserSelectMenuBuilder } from './selectMenu/UserSelectMenu.js';
import { TextInputBuilder } from './textInput/TextInput.js';

export interface MappedComponentTypes {
	[ComponentType.ActionRow]: ActionRowBuilder<AnyComponentBuilder>;
	[ComponentType.Button]: ButtonBuilder;
	[ComponentType.StringSelect]: StringSelectMenuBuilder;
	[ComponentType.TextInput]: TextInputBuilder;
	[ComponentType.UserSelect]: UserSelectMenuBuilder;
	[ComponentType.RoleSelect]: RoleSelectMenuBuilder;
	[ComponentType.MentionableSelect]: MentionableSelectMenuBuilder;
	[ComponentType.ChannelSelect]: ChannelSelectMenuBuilder;
}

/**
 * Factory for creating components from API data
 *
 * @param data - The api data to transform to a component class
 */
export function createComponentBuilder<T extends keyof MappedComponentTypes>(
	// eslint-disable-next-line @typescript-eslint/sort-type-union-intersection-members
	data: (APIModalComponent | APIMessageComponent) & { type: T },
): MappedComponentTypes[T];
export function createComponentBuilder<C extends MessageComponentBuilder | ModalComponentBuilder>(data: C): C;
export function createComponentBuilder(
	data: APIMessageComponent | APIModalComponent | MessageComponentBuilder,
): ComponentBuilder {
	if (data instanceof ComponentBuilder) {
		return data;
	}

	switch (data.type) {
		case ComponentType.ActionRow:
			return new ActionRowBuilder(data);
		case ComponentType.Button:
			return new ButtonBuilder(data);
		case ComponentType.StringSelect:
			return new StringSelectMenuBuilder(data);
		case ComponentType.TextInput:
			return new TextInputBuilder(data);
		case ComponentType.UserSelect:
			return new UserSelectMenuBuilder(data);
		case ComponentType.RoleSelect:
			return new RoleSelectMenuBuilder(data);
		case ComponentType.MentionableSelect:
			return new MentionableSelectMenuBuilder(data);
		case ComponentType.ChannelSelect:
			return new ChannelSelectMenuBuilder(data);
		default:
			// @ts-expect-error: This case can still occur if we get a newer unsupported component type
			throw new Error(`Cannot properly serialize component type: ${data.type}`);
	}
}
