import { fileURLToPath, URL } from 'node:url';
import image from '@astrojs/image';
import mdx from '@astrojs/mdx';
import prefetch from '@astrojs/prefetch';
import react from '@astrojs/react';
import { remarkCodeHike } from '@code-hike/mdx';
import { defineConfig } from 'astro/config';
import compress from 'astro-compress';
import critters from 'astro-critters';
import { type Node, toString } from 'hast-util-to-string';
import { h } from 'hastscript';
import { escape } from 'html-escaper';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import shikiThemeDarkPlus from 'shiki/themes/dark-plus.json' assert { type: 'json' };
import Unocss from 'unocss/astro';

const LinkIcon = h(
	'svg',
	{
		width: '1rem',
		height: '1rem',
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: '2',
		strokeLinecap: 'round',
		strokeLinejoin: 'round',
	},
	h('path', {
		// eslint-disable-next-line id-length
		d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
	}),
	h('path', {
		// eslint-disable-next-line id-length
		d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
	}),
);

const createSROnlyLabel = (text: string) => {
	const node = h('span.sr-only', `Section titled ${escape(text)}`);
	node.properties!['is:raw'] = true;
	return node;
};

const rootDir = new URL('../../', import.meta.url);

export default defineConfig({
	integrations: [
		react(),
		mdx({
			remarkPlugins: [[remarkCodeHike, { autoImport: false, theme: shikiThemeDarkPlus, lineNumbers: true }]],
			rehypePlugins: [
				rehypeSlug,
				[
					rehypeAutolinkHeadings,
					{
						properties: {
							class:
								'relative inline-flex w-6 h-6 place-items-center place-content-center outline-0 text-black dark:text-white ml-2',
						},
						behavior: 'after',
						group: ({ tagName }: { tagName: string }) =>
							h('div', {
								class: `[&>*]:inline-block [&>h1]:m-0 [&>h2]:m-0 [&>h3]:m-0 [&>h4]:m-0 level-${tagName}`,
								tabIndex: -1,
							}),
						content: (heading: Node) => [
							h(
								`span.anchor-icon`,
								{
									ariaHidden: 'true',
								},
								LinkIcon,
							),
							createSROnlyLabel(toString(heading)),
						],
					},
				],
			],
		}),
		image({
			serviceEntryPoint: '@astrojs/image/sharp',
		}),
		prefetch({
			throttle: 3,
		}),
		Unocss({
			configFile: fileURLToPath(new URL('unocss.config.ts', rootDir)),
		}),
		critters(),
		compress(),
	],
	markdown: {
		extendDefaultPlugins: true,
		syntaxHighlight: false,
	},
	vite: {
		resolve: {
			alias: {
				'ariakit/button': fileURLToPath(new URL('node_modules/ariakit/esm/button/index.js', rootDir)),
				'ariakit/disclosure': fileURLToPath(new URL('node_modules/ariakit/esm/disclosure/index.js', rootDir)),
				'ariakit/separator': fileURLToPath(new URL('node_modules/ariakit/esm/separator/index.js', rootDir)),
				'ariakit-utils/dom': fileURLToPath(new URL('node_modules/ariakit-utils/esm/dom.js', rootDir)),
				'ariakit-utils/events': fileURLToPath(new URL('node_modules/ariakit-utils/esm/events.js', rootDir)),
				'ariakit-utils/focus': fileURLToPath(new URL('node_modules/ariakit-utils/esm/focus.js', rootDir)),
				'ariakit-utils/hooks': fileURLToPath(new URL('node_modules/ariakit-utils/esm/hooks.js', rootDir)),
				'ariakit-utils/misc': fileURLToPath(new URL('node_modules/ariakit-utils/esm/misc.js', rootDir)),
				'ariakit-utils/platform': fileURLToPath(new URL('node_modules/ariakit-utils/esm/platform.js', rootDir)),
				'ariakit-utils/system': fileURLToPath(new URL('node_modules/ariakit-utils/esm/system.js', rootDir)),
				'react-icons/fi': fileURLToPath(new URL('node_modules/react-icons/fi/index.esm.js', rootDir)),
				'react-icons/vsc': fileURLToPath(new URL('node_modules/react-icons/vsc/index.esm.js', rootDir)),
				'react-use': fileURLToPath(new URL('node_modules/react-use/esm/index.js', rootDir)),
			},
		},
	},
});
