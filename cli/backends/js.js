// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { BaseGen } from '../gen.js'

class Gen extends BaseGen {
	pub_syms = []

	post_stage() {
		this.footer_out = `export { ${this.pub_syms.join(', ')} }`
	}

	const_decl(node) {
		if (node.pub) {
			this.pub_syms.push(node.name)
		}

		this.write(`const ${node.name} = `)
		this.expr(node.expr)
		this.writeln('')
	}

	cast_expr(node) {
		this.expr(node.expr)
	}
}

export { Gen }
