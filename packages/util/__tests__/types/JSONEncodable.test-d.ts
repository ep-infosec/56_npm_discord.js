import { expectType } from 'tsd';
import type { JSONEncodable } from '../../dist';
import { isJSONEncodable } from '../../src/index.js';

declare const unknownObj: unknown;

if (isJSONEncodable(unknownObj)) {
	expectType<JSONEncodable<unknown>>(unknownObj);
	expectType<unknown>(unknownObj.toJSON());
}
