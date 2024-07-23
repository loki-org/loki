// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { BaseGen } from '../gen.js'

class Gen extends BaseGen {
	setup() {
		this.alt_name = this.file_name.replace('.lo', '.h')
	}

	pre_stage() {
		this.header_out += `#include "${this.alt_name}"\n`

		this.alt_out = this.line_comment(this.LOKI_HEADER)
		this.alt_out += '#pragma once\n\n'
	}

	const_decl(node) {
		this.alt_out += `#define ${node.name} `
		this.alt_out += this.expr_string(node.expr)
		this.alt_out += '\n'
	}

	cast_expr(node) {
		this.expr(node.expr)
	}
}

export { Gen }
