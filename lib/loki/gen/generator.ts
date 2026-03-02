export abstract class Generator {
	private buffer: string = ''
	private indent_level: number = 0
	private at_line_start: boolean = true

	constructor() {}

	indent() {
		this.indent_level++
	}

	dedent() {
		this.indent_level--
		if (this.indent_level < 0) this.indent_level = 0
	}

	write(code: string) {
		if (this.at_line_start && code !== '\n') {
			this.buffer += '\t'.repeat(this.indent_level)
			this.at_line_start = false
		}
		this.buffer += code
		if (code.endsWith('\n')) {
			this.at_line_start = true
		}
	}

	write_ln(code: string = '') {
		this.write(code + '\n')
	}

	to_string(): string {
		return this.buffer
	}
}
