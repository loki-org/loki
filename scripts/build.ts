import { type BuildConfig, build } from 'bun'

const cfg: BuildConfig = {
	entrypoints: ['cli/loki.ts'],
	outdir: 'dist',
	target: 'node',
}

await build(cfg)
