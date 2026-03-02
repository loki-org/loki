import type * as ast from '../ast/nodes.ts'
import { Generator } from './generator.ts'

export class JsGenerator extends Generator {
	gen_file(node: ast.File) {
		for (const item of node.items) {
			this.gen_item(item)
			this.write('\n')
		}
	}

	private gen_item(node: ast.Item) {
		switch (node.kind) {
			case 'fn_decl':
				this.gen_fn_decl(node)
				break
			case 'var_decl':
				this.gen_var_decl(node)
				this.write(';\n')
				break
			case 'const_decl':
				this.gen_const_decl(node)
				this.write(';\n')
				break
			case 'struct_decl':
				this.gen_struct_decl(node)
				break
		}
	}

	private gen_fn_decl(node: ast.FnDecl) {
		this.write(`function ${node.name}(`)
		for (let i = 0; i < node.params.length; i++) {
			const param = node.params[i]
			this.write(`${param.name}: ${this.map_type_expr(param.type_ann)}`)
			if (i < node.params.length - 1) this.write(', ')
		}
		this.write(') ')
		this.gen_block(node.body)
	}

	private gen_struct_decl(node: ast.StructDecl) {
		this.write(`type ${node.name} = {\n`)
		this.indent()
		for (const field of node.fields) {
			const ts_type = this.map_type_expr(field.type_ann)
			this.write(`${field.name}: ${ts_type};\n`)
		}
		this.dedent()
		this.write('};\n')
	}

	private gen_var_decl(node: ast.VarDecl) {
		const keyword = node.mutable ? 'let' : 'const'
		this.write(`${keyword} ${node.name} = `)
		this.gen_expr(node.init)
	}

	private gen_const_decl(node: ast.ConstDecl) {
		this.write(`const ${node.name} = `)
		this.gen_expr(node.init)
	}

	private gen_block(node: ast.Block) {
		this.write('{\n')
		this.indent()
		for (const stmt of node.stmts) {
			this.gen_stmt(stmt)
		}
		this.dedent()
		this.write('}\n')
	}

	private gen_stmt(node: ast.Stmt) {
		switch (node.kind) {
			case 'block':
				this.gen_block(node)
				break
			case 'var_decl':
				this.gen_var_decl(node)
				this.write(';\n')
				break
			case 'const_decl':
				this.gen_const_decl(node)
				this.write(';\n')
				break
			case 'expr_stmt':
				this.gen_expr(node.expr)
				this.write(';\n')
				break
			case 'return_stmt':
				this.write('return ')
				if (node.value) this.gen_expr(node.value)
				this.write(';\n')
				break
			case 'if_stmt': {
				this.write('if (')
				this.gen_expr(node.cond)
				this.write(') ')
				this.gen_block(node.then_block)
				if (node.else_branch) {
					this.write('else ')
					if (node.else_branch.kind === 'block') {
						this.gen_block(node.else_branch)
					} else {
						this.gen_stmt(node.else_branch)
					}
				}
				break
			}
			case 'for_stmt':
				this.gen_for_stmt(node)
				break
			case 'break_stmt':
				this.write('break;\n')
				break
			case 'continue_stmt':
				this.write('continue;\n')
				break
		}
	}

	private gen_for_stmt(node: ast.ForStmt) {
		if (node.init && node.init.kind === 'for_in_init') {
			// for x in expr
			const init = node.init
			this.write('for (const ')
			if (init.key) {
				// map iterate logic to JS
				// for key, val in map -> for (const [key, val] of map)
				this.write(`[${init.key}, ${init.value}] of `)
			} else {
				this.write(`${init.value} of `)
			}
			this.gen_expr(init.expr)
			this.write(') ')
			this.gen_block(node.body)
			return
		}

		this.write('for (')
		if (node.init) {
			if (node.init.kind === 'var_decl') {
				this.gen_var_decl(node.init)
			} else if (node.init.kind === 'const_decl') {
				this.gen_const_decl(node.init)
			} else if (node.init.kind === 'expr_stmt') {
				this.gen_expr(node.init.expr)
			}
		}
		this.write('; ')
		if (node.cond) this.gen_expr(node.cond)
		this.write('; ')
		if (node.post) {
			// Post-stmt can't have semicolon in for loop
			if (node.post.kind === 'expr_stmt') {
				this.gen_expr(node.post.expr)
			} else if (node.post.kind === 'var_decl' || node.post.kind === 'const_decl') {
				// Rare in classic for post, but handle it
				this.gen_var_decl(node.post as ast.VarDecl)
			}
		}
		this.write(') ')
		this.gen_block(node.body)
	}

	private gen_expr(node: ast.Expr) {
		switch (node.kind) {
			case 'int_lit':
			case 'float_lit':
			case 'bool_lit':
				this.write(node.value.toString())
				break
			case 'string_lit':
				this.write(JSON.stringify(node.value))
				break
			case 'null_lit':
				this.write('null')
				break
			case 'ident_expr':
				this.write(node.name)
				break
			case 'binary_expr': {
				this.write('(')
				this.gen_expr(node.left)
				let op = node.op
				if (op === 'and') op = '&&'
				if (op === 'or') op = '||'
				this.write(` ${op} `)
				this.gen_expr(node.right)
				this.write(')')
				break
			}
			case 'unary_expr': {
				let op = node.op
				if (op === 'not') op = '!'
				this.write(`(${op}`)
				this.gen_expr(node.operand)
				this.write(')')
				break
			}
			case 'call_expr':
				this.gen_expr(node.callee)
				this.write('(')
				for (let i = 0; i < node.args.length; i++) {
					this.gen_expr(node.args[i])
					if (i < node.args.length - 1) this.write(', ')
				}
				this.write(')')
				break
			case 'index_expr':
				this.gen_expr(node.object)
				this.write('[')
				this.gen_expr(node.index)
				this.write(']')
				break
			case 'member_expr':
				this.gen_expr(node.object)
				this.write('.')
				this.write(node.member)
				break
			case 'assign_expr':
				// Handle compound assignments too since outer.op is passed
				this.gen_expr(node.target)
				this.write(` ${node.op} `)
				this.gen_expr(node.value)
				break
		}
	}

	private map_type_expr(node: ast.TypeExpr): string {
		switch (node.kind) {
			case 'named_type':
				return this.map_named_type(node.name)
			case 'array_type':
				return `${this.map_type_expr(node.elem)}[]`
			case 'optional_type':
				return `${this.map_type_expr(node.inner)} | null`
		}
	}

	private map_named_type(name: string): string {
		switch (name) {
			case 'int':
			case 'float':
				return 'number'
			case 'string':
				return 'string'
			case 'bool':
				return 'boolean'
			case 'void':
				return 'void'
			default:
				return name // Custom type
		}
	}
}
