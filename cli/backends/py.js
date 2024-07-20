// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { BaseGen } from '../gen.js'

class Gen extends BaseGen {
	pre_stage() {
		this.comment_sign = '#'
	}

	const_decl(node) {
		this.write(`${node.name} = `)
		this.expr(node.expr)
		this.writeln('')
	}

	cast_expr(node) {
		this.expr(node.expr)
	}
}

export { Gen }
