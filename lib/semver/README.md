# semver

Small SemVer parser and matcher used in Loki.

## What it provides

- Parse versions into a `Version` object (`parseVersion`, `Version.parse`)
- Compare versions (`Version.compare`, `Version.eq`)
- Parse version requirements (`parseVersionReq`, `VersionReq.parse`)
- Check whether a version satisfies a requirement (`versionSatisfies`)

## Quick examples

```ts
import { parseVersion, parseVersionReq, versionSatisfies } from './index'

const v = parseVersion('1.2.3-alpha.1+build.9')
console.log(v.major, v.minor, v.patch) // 1 2 3
console.log(v.pre, v.build) // alpha.1 build.9

const req = parseVersionReq('>=1.2.0, <2.0.0')
console.log(req.matches(parseVersion('1.9.9'))) // true

console.log(versionSatisfies('1.5.2', '^1.2.3')) // true
console.log(versionSatisfies('2.0.0', '^1.2.3')) // false
```

## Supported requirement syntax

- Comparison: `=`, `>`, `>=`, `<`, `<=`
- Compatible ranges: `^`, `~`
- Wildcards: `*`, `x`, `X` (for example: `1.*`)
- Multiple comparators joined by commas (logical AND): `>=1.2.0, <2.0.0`

## Prerelease rule

Prerelease versions only satisfy a requirement when at least one comparator in the requirement also uses a prerelease for the same core version.

Example:

- `1.2.3-alpha.1` does **not** satisfy `^1.2.3`
- `1.2.3-alpha.1` **does** satisfy `>=1.2.3-alpha.1, <1.2.3`
