import { s } from '@sapphire/shapeshift';
import { ApplicationCommandOptionType, type APIApplicationCommandOptionChoice } from 'discord-api-types/v10';
import { localizationMapPredicate, validateChoicesLength } from '../Assertions.js';

const stringPredicate = s.string.lengthGreaterThanOrEqual(1).lengthLessThanOrEqual(100);
const numberPredicate = s.number.greaterThan(Number.NEGATIVE_INFINITY).lessThan(Number.POSITIVE_INFINITY);
const choicesPredicate = s.object({
	name: stringPredicate,
	name_localizations: localizationMapPredicate,
	value: s.union(stringPredicate, numberPredicate),
}).array;
const booleanPredicate = s.boolean;

export class ApplicationCommandOptionWithChoicesAndAutocompleteMixin<T extends number | string> {
	public readonly choices?: APIApplicationCommandOptionChoice<T>[];

	public readonly autocomplete?: boolean;

	// Since this is present and this is a mixin, this is needed
	public readonly type!: ApplicationCommandOptionType;

	/**
	 * Adds multiple choices for this option
	 *
	 * @param choices - The choices to add
	 */
	public addChoices(...choices: APIApplicationCommandOptionChoice<T>[]): this {
		if (choices.length > 0 && this.autocomplete) {
			throw new RangeError('Autocomplete and choices are mutually exclusive to each other.');
		}

		choicesPredicate.parse(choices);

		if (this.choices === undefined) {
			Reflect.set(this, 'choices', []);
		}

		validateChoicesLength(choices.length, this.choices);

		for (const { name, name_localizations, value } of choices) {
			// Validate the value
			if (this.type === ApplicationCommandOptionType.String) {
				stringPredicate.parse(value);
			} else {
				numberPredicate.parse(value);
			}

			this.choices!.push({ name, name_localizations, value });
		}

		return this;
	}

	public setChoices<Input extends APIApplicationCommandOptionChoice<T>[]>(...choices: Input): this {
		if (choices.length > 0 && this.autocomplete) {
			throw new RangeError('Autocomplete and choices are mutually exclusive to each other.');
		}

		choicesPredicate.parse(choices);

		Reflect.set(this, 'choices', []);
		this.addChoices(...choices);

		return this;
	}

	/**
	 * Marks the option as autocompletable
	 *
	 * @param autocomplete - If this option should be autocompletable
	 */
	public setAutocomplete(autocomplete: boolean): this {
		// Assert that you actually passed a boolean
		booleanPredicate.parse(autocomplete);

		if (autocomplete && Array.isArray(this.choices) && this.choices.length > 0) {
			throw new RangeError('Autocomplete and choices are mutually exclusive to each other.');
		}

		Reflect.set(this, 'autocomplete', autocomplete);

		return this;
	}
}
