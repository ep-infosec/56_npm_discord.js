import { Section } from '@discordjs/ui';
import type { MDXInstance } from 'astro';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-use';

export type MDXPage = MDXInstance<{ category: string; title: string }>;

export function SidebarItems({ pages }: { pages: MDXPage[] }) {
	const state = useLocation();
	const [active, setActive] = useState<string | undefined>('');

	const categories = useMemo(
		() =>
			pages.reduce<Record<string, MDXPage[]>>((acc, page) => {
				if (acc[page.frontmatter.category]) {
					acc[page.frontmatter.category]?.push(page);
				} else {
					acc[page.frontmatter.category] = [page];
				}

				return acc;
			}, {}),
		[pages],
	);

	useEffect(() => {
		setActive(state.pathname);
	}, [state]);

	return Object.keys(categories).map((category, idx) => (
		<Section key={idx} title={category}>
			{categories[category]?.map((member, index) => (
				<a
					className={`dark:border-dark-100 border-light-800 focus:ring-width-2 focus:ring-blurple ml-5 flex flex-col border-l p-[5px] pl-6 outline-0 focus:rounded focus:border-0 focus:ring ${
						(member.url || '/') === active
							? 'bg-blurple text-white'
							: 'dark:hover:bg-dark-200 dark:active:bg-dark-100 hover:bg-light-700 active:bg-light-800'
					}`}
					// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
					href={member.url || '/'}
					key={index}
					title={member.frontmatter.title}
				>
					<div className="flex flex-row place-items-center gap-2 lg:text-sm">
						<span className="truncate">{member.frontmatter.title}</span>
					</div>
				</a>
			)) ?? null}
		</Section>
	));
}
