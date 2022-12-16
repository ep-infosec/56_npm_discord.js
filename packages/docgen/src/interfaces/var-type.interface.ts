import type { Type } from './index.js';

export interface VarType extends Type {
	description?: string | undefined;
	nullable?: boolean | undefined;
	type?: Required<Type> | undefined;
}
