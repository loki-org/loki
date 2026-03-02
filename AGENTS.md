# AGENTS.md - Loki Programming Language

## Project Overview

Loki is a programming language that fills a role similar to TypeScript but with less complexity and different syntax. It is implemented in TypeScript using bun.js as the runtime. The project includes a CLI and core compiler that transpiles `.lo` files to JavaScript, along with standard libraries.

### Prerequisites
- **Runtime**: bun.js (>= 1.3.9)
- **Language**: TypeScript

## Code Style Guidelines

### General Principles
- Keep code simple and readable - avoid unnecessary complexity
- Follow the principle that the language should be "less complicated than TypeScript"
- Write self-documenting code with clear naming

### Naming Conventions

- **Files**: snake_case (e.g., `tokenizer.ts`, `parser_utils.ts`)
- **Classes/Interfaces/Types**: PascalCase (e.g., `Lexer`, `ASTNode`)
- **Functions/Variables**: snake_case (e.g., `parse_tokens`, `current_token`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_TOKEN_LENGTH`)
- **Enums**: PascalCase for enum, snake_case for values

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
