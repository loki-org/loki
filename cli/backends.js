// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import { CGen } from './gen_c.js'
import { TsGen } from './gen_ts.js'

const BACKENDS = {
	'c': CGen,
	'ts': TsGen,
}

export { BACKENDS }
