// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { IDXS } from '../table.js'
import { BaseGen } from '../gen.js'

class Gen extends BaseGen {
	pub_syms = []

	setup() {
		this.alt_name = 'index.d.ts'
	}

	pre_stage() {
		this.alt_out = this.line_comment(this.LOKI_HEADER)
		// TODO headers: library name, version
		//   see https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html#library-file-layout
	}

	post_stage() {
		this.footer_out = `export { ${this.pub_syms.join(', ')} }`
	}

	const_decl(node) {
		if (node.pub) {
			this.pub_syms.push(node.name)
			const typ = this.type(node.type)
			this.alt_out += `export const ${node.name}: ${typ}\n`
		}

		this.write(`const ${node.name} = `)
		this.expr(node.expr)
		this.writeln('')
	}

	cast_expr(node) {
		this.expr(node.expr)
	}

	type(t) {
		if (t >= IDXS.i32 && t <= IDXS.u32) {
			return 'number'
		}
		return 'any'
	}
}

export { Gen }
