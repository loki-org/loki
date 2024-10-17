// SPDX-FileCopyrightText: 2024-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { exec } from 'node:child_process'

class BaseRunner {
	get_run_command(path) {
		throw new Error('Not implemented')
	}

	run(path) {
		const cmd = this.get_run_command(path)
		exec(cmd, (err, stdout, stderr) => {
			if (err) {
				process.exit(1)
			}

			if (stdout.length > 0) {
				console.log(stdout)
			}
			if (stderr.length > 0) {
				console.log(stderr)
			}
		})
	}
}

export { BaseRunner }
