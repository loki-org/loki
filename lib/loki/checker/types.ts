import type { Pos } from '../lexer/token.ts'

export enum TypeKind {
	int,
	float,
	string,
	bool,
	void,
	error,
}

export interface Type {
	kind: TypeKind
}

export const type_int: Type = { kind: TypeKind.int }
export const type_float: Type = { kind: TypeKind.float }
export const type_string: Type = { kind: TypeKind.string }
export const type_bool: Type = { kind: TypeKind.bool }
export const type_void: Type = { kind: TypeKind.void }
export const type_error: Type = { kind: TypeKind.error }

export function type_name(t: Type): string {
	switch (t.kind) {
		case TypeKind.int:
			return 'int'
		case TypeKind.float:
			return 'float'
		case TypeKind.string:
			return 'string'
		case TypeKind.bool:
			return 'bool'
		case TypeKind.void:
			return 'void'
		case TypeKind.error:
			return '<error>'
	}
}
