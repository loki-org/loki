export type File = {
	path: string
	stmts: Stmt[]
}

export type Stmt = FunDecl

export type FunDecl = {
	kind: 'FunDecl'
	name: string
	params: FunParam[]
	body: Stmt[]
}

export type FunParam = {
	name: string
	type: number
}

export type Program = {
	files: File[]
}
