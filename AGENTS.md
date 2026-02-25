# AGENTS.md - Loki Programming Language

## Project Overview

Loki is a programming language that fills a role similar to TypeScript but with less complexity and different syntax. It is implemented in TypeScript using bun.js as the runtime. The project includes a CLI and core compiler that transpiles `.lo` files to JavaScript, along with standard libraries.

### Prerequisites
- **Runtime**: bun.js (>= 1.3.9)
- **Language**: TypeScript

### Core Commands

```bash
# Install dependencies
bun install

# Build the project (compile TypeScript)
bun run build

# Run the CLI
bun run cli [args]

# Transpile a loki file to JavaScript
bun run cli build path/to/file.lo
```

### Linting

```bash
# Run linter (biome)
bun run lint

# Fix linting issues
bun run lint:fix
```

### Testing

```bash
# Run all tests
bun test

# Run a single test file
bun test path/to/test_file.test.ts
```

### Type Checking

```bash
# Run TypeScript type checking
bun run check
```

## Code Style Guidelines

### General Principles
- Keep code simple and readable - avoid unnecessary complexity
- Follow the principle that the language should be "less complicated than TypeScript"
- Write self-documenting code with clear naming

### TypeScript Conventions
- Use explicit return types for public functions
- Prefer `interface` over `type` for object shapes that may be extended
- Use `type` for unions, intersections, and primitives
- Avoid `any` - use `unknown` when type is truly unknown

### Naming Conventions

- **Files**: snake_case (e.g., `tokenizer.ts`, `parser_utils.ts`)
- **Classes/Interfaces/Types**: PascalCase (e.g., `Lexer`, `ASTNode`)
- **Functions/Variables**: snake_case (e.g., `parse_tokens`, `current_token`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_TOKEN_LENGTH`)
- **Enums**: PascalCase for enum, snake_case for values

### Imports
- Use absolute imports with path aliases configured in tsconfig
- Group imports: external -> internal -> relative
- Sort alphabetically within groups

### Formatting
- Use 2 spaces for indentation
- Maximum line length: 100 characters
- Use semicolons
- Double quotes for strings
- Trailing commas in multi-line objects/arrays

### Error Handling
- Use custom error classes that extend `Error`
- Include meaningful error messages with context
- For compilation errors, track location (line, column, file)

### Project Structure

```
cli/loki.ts       # Compiler entry point

lib/loki/         # Core compiler modules 
├── ast/          # AST node definitions
├── lexer/        # Tokenization
├── parser/       # Produce AST from tokens
├── sema/         # Type checking and resolution
├── transformer/  # Common AST optimizations and simplifications
├── gen/          # Code generation
├── tests/        # Compiler feature tests
└── tests_slow/   # Output and other slow tests
```

### Compiler-Specific Guidelines

### Lexer
- Create tokens with source location metadata
- Handle whitespace and comments appropriately
- Support meaningful error messages for unexpected characters

### Parser
- Build AST nodes with location info for error reporting
- Handle operator precedence correctly
- Support meaningful syntax errors

### Code Generation
- Generate clean, readable JavaScript
- Preserve source maps if possible
- Handle edge cases (e.g., reserved words as identifiers)

### Testing
- Test compiler with `.lo` fixture files
- Include both valid and invalid input tests
- Test error messages for invalid syntax

### Git Conventions
- Prefix commits with the code part: `lexer:`, `gen:`, `ci:`, `docs:`
- Keep commits focused: one logical change per commit

## Editor Configuration

### VS Code Recommended Extensions
- Bun
- TypeScript and JavaScript Language Features
- Biome
