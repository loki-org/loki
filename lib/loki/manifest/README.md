# manifest

Utilities for validating `loki.toml` and converting it into `package.json` data.

## What it provides

- Convert a `loki.toml` file in a directory into `dist/package.json` (`convert_lokitoml`)
- Convert raw TOML text into a package.json-shaped object (`convert_lokitoml_text`)
- Validate parsed manifest data (`validate_lokitoml`)
- Field validators for common checks:
  - `validateProjectName`
  - `validateVersion`
  - `validateKeywords`

## Quick examples

```ts
import { convert_lokitoml, convert_lokitoml_text, validate_lokitoml } from './index'

// Reads <dir>/loki.toml and writes <dir>/dist/package.json
convert_lokitoml('/path/to/project')

const pkg = convert_lokitoml_text(`
[project]
name = "demo_pkg"
version = "1.0.0"
`)

const validated = validate_lokitoml({
  project: { name: 'demo_pkg', version: '1.0.0' },
})
```

## Supported `loki.toml` shape

Top-level tables:

- `project` (required)
- `dependencies` (optional)
- `dev_dependencies` (optional)

Supported `[project]` fields:

- `name` (required)
- `version` (required)
- `description`, `keywords`, `homepage`, `repository` (optional)
- `license` or `license_file` (optional, mutually exclusive)

## Validation rules (high level)

- `project.name` must be 1-128 chars and only `[A-Za-z0-9_]`
- `project.version` must be a valid SemVer version
- `project.keywords` must be an array of strings with at most 10 items
- `project.homepage` and `project.repository` cannot be identical
- `project.license` and `project.license_file` cannot both be set
