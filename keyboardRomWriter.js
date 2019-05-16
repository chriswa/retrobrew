const util = require('./util.js')
const moveBit = util.moveBit
const argv = require('minimist')(process.argv.slice(2))
const romWriter = require('./romWriter.js')

const chipIndex = argv.chip
if (chipIndex === undefined) {
	throw new Error(`--chip=0..1 must be specified`)
}

function formatBits(n, bits) {
	let s = n.toString(2)
	while (s.length < bits) { s = '0' + s }
	return s
}

function combinatoricsForBrkShiftCtrlAlt(callback) {
	;[true, false].forEach(brk => {
		;[true, false].forEach(shift => {
			;[true, false].forEach(ctrl => {
				;[true, false].forEach(alt => {
					callback(brk, shift, ctrl, alt)
				})
			})
		})
	})
}
function combinatoricsForBrkModShiftCtrlAlt(callback) {
	;[true, false].forEach(mod => {
		combinatoricsForBrkShiftCtrlAlt((brk, shift, ctrl, alt) => {
			callback(brk, mod, shift, ctrl, alt)
		})
	})
}

function buildPairs() {
	const pairCollection = new InputOutputPairCollection()
	keys.forEach(({scancode, mod, result}) => {
		combinatoricsForBrkShiftCtrlAlt((brk, shift, ctrl, alt) => {
			const inputState = new State({ brk, mod, shift, ctrl, alt })
			const input = new Input(scancode, inputState)
			const output = result(input)
			pairCollection.addPair(input, output)
		})
	})
	const breakCode = 0xF0
	combinatoricsForBrkModShiftCtrlAlt((brk, mod, shift, ctrl, alt) => {
		const input = new Input(breakCode, new State({ brk, mod, shift, ctrl, alt }))
		const output = new Output(0, new State({ brk: true, mod, shift, ctrl, alt }), new Flags({ output: false }))
		pairCollection.addPair(input, output)
	})
	const modCode = 0xE0
	combinatoricsForBrkModShiftCtrlAlt((brk, mod, shift, ctrl, alt) => {
		const input = new Input(modCode, new State({ brk, mod, shift, ctrl, alt }))
		const output = new Output(0, new State({ brk, mod: true, shift, ctrl, alt }), new Flags({ output: false }))
		pairCollection.addPair(input, output)
	})
	const resetCode = 0xAA
	combinatoricsForBrkModShiftCtrlAlt((brk, mod, shift, ctrl, alt) => {
		const input = new Input(resetCode, new State({ brk, mod, shift, ctrl, alt }))
		const output = new Output(0, new State({ brk: false, mod: false, shift: false, ctrl: false, alt: false }), new Flags({ output: false }))
		pairCollection.addPair(input, output)
	})

	for (let scancode = 0; scancode <= 0xff; scancode += 1) {
		combinatoricsForBrkModShiftCtrlAlt((brk, mod, shift, ctrl, alt) => {
			const input = new Input(scancode, new State({ brk, mod, shift, ctrl, alt }))
			const existingPair = pairCollection.findPairByInput(input)
			if (!existingPair) {
				const output = keyResultNone()(input)
				pairCollection.addPair(input, output)
			}
		})
	}

	return pairCollection
}

function test(scancode, state = undefined) {
	if (state === undefined) { state = new State({ brk: true, mod: true, shift: true, ctrl: true, alt: true }) }
	console.log(`test scancode 0x${scancode.toString(16)}`)
	const pair = pairCollection.findPairByInput(new Input(scancode, state))
	console.log(`asciiChip: @ ${formatBits(asciiChip.getAddressFromInput(pair.input), 13)} = ${formatBits(asciiChip.getDataFromOutput(pair.output), 8)}${pair.output.flags.output ? ` 0x${pair.output.ascii.toString(16)} '${String.fromCharCode(pair.output.ascii)}'?` : ''}`)
	console.log(`logicChip: @ ${formatBits(logicChip.getAddressFromInput(pair.input), 13)} = ${formatBits(logicChip.getDataFromOutput(pair.output), 8)}`)
	return pair.output.state
}

let pairCollection, asciiChip, logicChip

function main() {
	pairCollection = buildPairs()

	asciiChip = new AsciiChip()
	logicChip = new LogicChip()


	let state
	state = test(0xAA, state)

	state = test(0x1C, state) // a

	state = test(0xF0, state)
	state = test(0x1C, state) // break a

	state = test(0x12, state) // left shift

	state = test(0x1C, state) // a

	state = test(0xF0, state)
	state = test(0x1C, state) // break a

	state = test(0xF0, state)
	state = test(0x12, state) // break left shift

	state = test(0x1C, state) // a

	state = test(0xE0, state)
	state = test(0x75, state) // up arrow (0x96)

	state = test(0x75, state) // numpad 8

	const chip = chipIndex === 0 ? asciiChip : logicChip

	pairCollection.forEach((pair) => {
		const address = chip.getAddressFromInput(pair.input)
		const data = chip.getDataFromOutput(pair.output)
		romWriter.write(address, data)
	})

	if (!argv.dry) {
		romWriter.start()
	}
}

/** @returns {boolean} */
function isBitSet(n, bit) {
	return !!((n >> bit) & 1)
}
/** @returns {number} */
function bitsToNumber(array) {
	let n = 0
	array.forEach((bit, index) => {
		n |= (bit ? 1 : 0) << index
	})
	return n
}

/*interface Chip {
	/** @param {Number} index * /
	constructor(index) { this.index = index }
	/** @param {Input} input * /
	getAddressFromInput(input) { return 0 }
	/** @param {Output} output * /
	getDataFromOutput(output) { return 0 }
}*/
class AsciiChip {
	/** @param {Input} input */
	getAddressFromInput(input) {
		return bitsToNumber([
			isBitSet(input.scancode, 7),
			isBitSet(input.scancode, 6),
			isBitSet(input.scancode, 5),
			isBitSet(input.scancode, 4),
			isBitSet(input.scancode, 3),
			isBitSet(input.scancode, 2),
			isBitSet(input.scancode, 1),
			isBitSet(input.scancode, 0),
			input.state.mod,
			input.state.shift,
			input.state.alt,
			input.state.ctrl,
			input.state.brk,
		])
	}
	/** @param {Output} output */
	getDataFromOutput(output) {
		return bitsToNumber([
			isBitSet(output.ascii, 0),
			isBitSet(output.ascii, 1),
			isBitSet(output.ascii, 2),
			isBitSet(output.ascii, 4), // sic!
			isBitSet(output.ascii, 5),
			isBitSet(output.ascii, 6),
			isBitSet(output.ascii, 7),
			isBitSet(output.ascii, 3),
		])
	}
}
class LogicChip {
	/** @param {Input} input */
	getAddressFromInput(input) {
		return bitsToNumber([
			isBitSet(input.scancode, 0),
			isBitSet(input.scancode, 1),
			isBitSet(input.scancode, 2),
			isBitSet(input.scancode, 3),
			isBitSet(input.scancode, 4),
			isBitSet(input.scancode, 5),
			isBitSet(input.scancode, 6),
			isBitSet(input.scancode, 7),
			input.state.ctrl,
			input.state.alt,
			input.state.mod,
			input.state.shift,
			input.state.brk,
		])
	}
	/** @param {Output} output */
	getDataFromOutput(output) {
		return bitsToNumber([
			false,
			false,
			!output.flags.output,
			output.state.alt,
			output.state.ctrl,
			output.state.shift,
			output.state.mod,
			output.state.brk,
		])
	}
}


class State {
	/** @param { { brk: boolean, mod: boolean, shift: boolean, ctrl: boolean, alt: boolean } } obj */
	constructor({ brk, mod, shift, ctrl, alt }) {
		this.brk = brk
		this.mod = mod
		this.shift = shift
		this.ctrl = ctrl
		this.alt = alt
	}
}
class Flags {
	/** @param { { output: boolean } } obj */
	constructor({ output }) {
		this.output = output
	}
}
class Input {
	/** @param { Number } scancode @param { State } state */
	constructor(scancode, state) {
		this.scancode = scancode
		this.state = state
	}
}
class Output {
	/** @param { Number | string } ascii @param { State } state @param { Flags } flags */
	constructor(ascii, state, flags) {
		this.ascii = typeof ascii === 'string' ? ascii.charCodeAt(0) : ascii
		this.state = state
		this.flags = flags
	}
}
class InputOutputPair {
	/** @param { Input } input @param { Output } output */
	constructor(input, output) {
		this.input = input
		this.output = output
	}
}

class InputOutputPairCollection {
	constructor() {
		/** @type { Array< InputOutputPair > } */
		this.pairs = []
		this.hashMap = {}
	}
	/** @param {Input} input @param {Output} output */
	addPair(input, output) {
		const pair = new InputOutputPair(input, output)
		this.pairs.push(pair)
		this.hashMap[this._getHashFromInput(input)] = pair
	}
	/** @param {Input} input */
	_getHashFromInput(input) {
		//const is = input.state
		//return input.scancode | bitsToNumber([is.ctrl, is.alt, is.brk, is.mod, is.shift]) << 8
		return JSON.stringify(input)
	}
	/** @param {Input} input */
	findPairByInput(input) {
		//return this.pairs.find(pair => JSON.stringify(pair.input) === JSON.stringify(input))
		return this.hashMap[this._getHashFromInput(input)]
	}
	/** @param {(InputOutputPair) => void} callback */
	forEach(callback) {
		this.pairs.forEach((pair) => callback(pair))
	}
}


/** @returns { (input: Input) => Output } */
function keyResultAlpha(lowerAscii, upperAscii) {
	if (typeof(lowerAscii) === 'string') { lowerAscii = lowerAscii.charCodeAt(0) }
	if (typeof(upperAscii) === 'string') { upperAscii = upperAscii.charCodeAt(0) }
	/** @param { Input } input @returns { Output } */
	return (input) => {
		let ascii = 0
		let outputFlag = false
		const outputState = new State(input.state)
		outputState.brk = false
		outputState.mod = false
		if (!input.state.brk) {
			outputFlag = true
			ascii = input.state.shift ? upperAscii : lowerAscii
			if (input.state.ctrl) { ascii += 0x80 }
			if (input.state.alt) { ascii -= 81 }
			while (ascii < 0x00) { ascii += 256 } // clamp
			while (ascii > 0xff) { ascii -= 256 } // clamp
		}
		return new Output(ascii, outputState, new Flags({ output: outputFlag }))
	}
}
/** @returns { (input: Input) => Output } */
function keyResultNone() {
	/** @param { Input } input @returns { Output } */
	return (input) => {
		const outputState = new State(input.state)
		outputState.brk = false
		outputState.mod = false
		return new Output(0, outputState, new Flags({ output: false }))
	}
}
/** @returns { (input: Input) => Output } */
function keyResultToggleState(stateKey) {
	/** @param { Input } input @returns { Output } */
	return (input) => {
		const outputState = new State(input.state)
		outputState.brk = false
		outputState.mod = false
		outputState[stateKey] = !input.state.brk
		return new Output(0, outputState, new Flags({ output: false }))
	}
}

/** @type { Array< { scancode: Number, mod: boolean, result: (Input) => Output } > } */
const keys = [
	// https://techdocs.altium.com/display/FPGA/PS2+Keyboard+Scan+Codes
	// n.b. ascii outputs 0x80..0x99 are arbitrarily chosen (they also correspond to blank glyphs in the 2004 LCD)
	{ scancode: 0x76, mod: false, result: keyResultAlpha(0x80, 0x80)    },  // make:76                break:F076          label:ESC
	{ scancode: 0x05, mod: false, result: keyResultAlpha(0x81, 0x81)    },  // make:05                break:F005          label:F1
	{ scancode: 0x06, mod: false, result: keyResultAlpha(0x82, 0x82)    },  // make:06                break:F006          label:F2
	{ scancode: 0x04, mod: false, result: keyResultAlpha(0x83, 0x83)    },  // make:04                break:F004          label:F3
	{ scancode: 0x0C, mod: false, result: keyResultAlpha(0x84, 0x84)    },  // make:0C                break:F00C          label:F4
	{ scancode: 0x03, mod: false, result: keyResultAlpha(0x85, 0x85)    },  // make:03                break:F003          label:F5
	{ scancode: 0x0B, mod: false, result: keyResultAlpha(0x86, 0x86)    },  // make:0B                break:F00B          label:F6
	{ scancode: 0x83, mod: false, result: keyResultAlpha(0x87, 0x87)    },  // make:83                break:F083          label:F7
	{ scancode: 0x0A, mod: false, result: keyResultAlpha(0x88, 0x88)    },  // make:0A                break:F00A          label:F8
	{ scancode: 0x01, mod: false, result: keyResultAlpha(0x89, 0x89)    },  // make:01                break:F001          label:F9
	{ scancode: 0x09, mod: false, result: keyResultAlpha(0x8A, 0x8A)    },  // make:09                break:F009          label:F10
	{ scancode: 0x78, mod: false, result: keyResultAlpha(0x8B, 0x8B)    },  // make:78                break:F078          label:F11
	{ scancode: 0x07, mod: false, result: keyResultAlpha(0x8C, 0x8C)    },  // make:07                break:F007          label:F12
	{ scancode: 0x7C, mod: true,  result: keyResultAlpha(0x8D, 0x8D)    },  // make:E012E07C          break:E0F07CE0F012  label:Prt Scr
	{ scancode: 0x7E, mod: false, result: keyResultAlpha(0x8E, 0x8E)    },  // make:7E                break:F07E          label:Scroll Lock
	{ scancode: 0xE1, mod: false, result: keyResultAlpha(0x8F, 0x8F)    },  // make:E11477E1F014E077  break:None          label:Pause/Break
	{ scancode: 0x0E, mod: false, result: keyResultAlpha('`',  '~' )    },  // make:0E                break:F00E          label:`
	{ scancode: 0x16, mod: false, result: keyResultAlpha('1',  '!' )    },  // make:16                break:F016          label:1
	{ scancode: 0x1E, mod: false, result: keyResultAlpha('2',  '@' )    },  // make:1E                break:F01E          label:2
	{ scancode: 0x26, mod: false, result: keyResultAlpha('3',  '#' )    },  // make:26                break:F026          label:3
	{ scancode: 0x25, mod: false, result: keyResultAlpha('4',  '$' )    },  // make:25                break:F025          label:4
	{ scancode: 0x2E, mod: false, result: keyResultAlpha('5',  '%' )    },  // make:2E                break:F02E          label:5
	{ scancode: 0x36, mod: false, result: keyResultAlpha('6',  '^' )    },  // make:36                break:F036          label:6
	{ scancode: 0x3D, mod: false, result: keyResultAlpha('7',  '&' )    },  // make:3D                break:F03D          label:7
	{ scancode: 0x3E, mod: false, result: keyResultAlpha('8',  '*' )    },  // make:3E                break:F03E          label:8
	{ scancode: 0x46, mod: false, result: keyResultAlpha('9',  '(' )    },  // make:46                break:F046          label:9
	{ scancode: 0x45, mod: false, result: keyResultAlpha('0',  ')' )    },  // make:45                break:F045          label:0
	{ scancode: 0x4E, mod: false, result: keyResultAlpha('-',  '_' )    },  // make:4E                break:F04E          label:-
	{ scancode: 0x55, mod: false, result: keyResultAlpha('=',  '+' )    },  // make:55                break:F055          label:=
	{ scancode: 0x66, mod: false, result: keyResultAlpha(0x08, 0x08)    },  // make:66                break:F066          label:Backspace
	{ scancode: 0x0D, mod: false, result: keyResultAlpha(0x09, 0x09)    },  // make:0D                break:F00D          label:Tab
	{ scancode: 0x15, mod: false, result: keyResultAlpha('q',  'Q' )    },  // make:15                break:F015          label:Q
	{ scancode: 0x1D, mod: false, result: keyResultAlpha('w',  'W' )    },  // make:1D                break:F01D          label:W
	{ scancode: 0x24, mod: false, result: keyResultAlpha('e',  'E' )    },  // make:24                break:F024          label:E
	{ scancode: 0x2D, mod: false, result: keyResultAlpha('r',  'R' )    },  // make:2D                break:F02D          label:R
	{ scancode: 0x2C, mod: false, result: keyResultAlpha('t',  'T' )    },  // make:2C                break:F02C          label:T
	{ scancode: 0x35, mod: false, result: keyResultAlpha('y',  'Y' )    },  // make:35                break:F035          label:Y
	{ scancode: 0x3C, mod: false, result: keyResultAlpha('u',  'U' )    },  // make:3C                break:F03C          label:U
	{ scancode: 0x43, mod: false, result: keyResultAlpha('i',  'I' )    },  // make:43                break:F043          label:I
	{ scancode: 0x44, mod: false, result: keyResultAlpha('o',  'O' )    },  // make:44                break:F044          label:O
	{ scancode: 0x4D, mod: false, result: keyResultAlpha('p',  'P' )    },  // make:4D                break:F04D          label:P
	{ scancode: 0x54, mod: false, result: keyResultAlpha('[',  '{' )    },  // make:54                break:F054          label:[
	{ scancode: 0x5B, mod: false, result: keyResultAlpha(']',  '}' )    },  // make:5B                break:F05B          label:]
	{ scancode: 0x5D, mod: false, result: keyResultAlpha('\\', '|' )    },  // make:5D                break:F05D          label:\
	{ scancode: 0x58, mod: false, result: keyResultNone()               },  // make:58                break:F058          label:Caps Lock
	{ scancode: 0x1C, mod: false, result: keyResultAlpha('a',  'A' )    },  // make:1C                break:F01C          label:A
	{ scancode: 0x1B, mod: false, result: keyResultAlpha('s',  'S' )    },  // make:1B                break:F01B          label:S
	{ scancode: 0x23, mod: false, result: keyResultAlpha('d',  'D' )    },  // make:23                break:F023          label:D
	{ scancode: 0x2B, mod: false, result: keyResultAlpha('f',  'F' )    },  // make:2B                break:F02B          label:F
	{ scancode: 0x34, mod: false, result: keyResultAlpha('g',  'G' )    },  // make:34                break:F034          label:G
	{ scancode: 0x33, mod: false, result: keyResultAlpha('h',  'H' )    },  // make:33                break:F033          label:H
	{ scancode: 0x3B, mod: false, result: keyResultAlpha('j',  'J' )    },  // make:3B                break:F03B          label:J
	{ scancode: 0x42, mod: false, result: keyResultAlpha('k',  'K' )    },  // make:42                break:F042          label:K
	{ scancode: 0x4B, mod: false, result: keyResultAlpha('l',  'L' )    },  // make:4B                break:F04B          label:L
	{ scancode: 0x4C, mod: false, result: keyResultAlpha(';',  ':' )    },  // make:4C                break:F04C          label:;
	{ scancode: 0x52, mod: false, result: keyResultAlpha("'",  '"' )    },  // make:52                break:F052          label:'
	{ scancode: 0x5A, mod: false, result: keyResultAlpha(0x0D, 0x0D)    },  // make:5A                break:F05A          label:Enter
	{ scancode: 0x12, mod: false, result: keyResultToggleState('shift') },  // make:12                break:F012          label:Shift (left)
	{ scancode: 0x1A, mod: false, result: keyResultAlpha('z',  'Z' )    },  // make:1A                break:F01A          label:Z
	{ scancode: 0x22, mod: false, result: keyResultAlpha('x',  'X' )    },  // make:22                break:F022          label:X
	{ scancode: 0x21, mod: false, result: keyResultAlpha('c',  'C' )    },  // make:21                break:F021          label:C
	{ scancode: 0x2A, mod: false, result: keyResultAlpha('v',  'V' )    },  // make:2A                break:F02A          label:V
	{ scancode: 0x32, mod: false, result: keyResultAlpha('b',  'B' )    },  // make:32                break:F032          label:B
	{ scancode: 0x31, mod: false, result: keyResultAlpha('n',  'N' )    },  // make:31                break:F031          label:N
	{ scancode: 0x3A, mod: false, result: keyResultAlpha('m',  'M' )    },  // make:3A                break:F03A          label:M
	{ scancode: 0x41, mod: false, result: keyResultAlpha(',',  '<' )    },  // make:41                break:F041          label:,
	{ scancode: 0x49, mod: false, result: keyResultAlpha('.',  '>' )    },  // make:49                break:F049          label:.
	{ scancode: 0x4A, mod: false, result: keyResultAlpha('/',  '?' )    },  // make:4A                break:F04A          label:/
	{ scancode: 0x59, mod: false, result: keyResultToggleState('shift') },  // make:59                break:F059          label:Shift (right)
	{ scancode: 0x14, mod: false, result: keyResultToggleState('ctrl')  },  // make:14                break:F014          label:Ctrl (left)
	{ scancode: 0x1F, mod: true,  result: keyResultNone()               },  // make:E01F              break:E0F01F        label:Windows (left)
	{ scancode: 0x11, mod: false, result: keyResultToggleState('alt')   },  // make:11                break:F011          label:Alt (left)
	{ scancode: 0x29, mod: false, result: keyResultAlpha(' ',  ' ' )    },  // make:29                break:F029          label:Spacebar
	{ scancode: 0x11, mod: true,  result: keyResultToggleState('alt')   },  // make:E011              break:E0F011        label:Alt (right)
	{ scancode: 0x27, mod: true,  result: keyResultNone()               },  // make:E027              break:E0F027        label:Windows (right)
	{ scancode: 0x2F, mod: true,  result: keyResultNone()               },  // make:E02F              break:E0F02F        label:Menus
	{ scancode: 0x14, mod: true,  result: keyResultToggleState('ctrl')  },  // make:E014              break:E0F014        label:Ctrl (right)
	{ scancode: 0x70, mod: true,  result: keyResultAlpha(0x90, 0x90)    },  // make:E070              break:E0F070        label:Insert
	{ scancode: 0x6C, mod: true,  result: keyResultAlpha(0x91, 0x91)    },  // make:E06C              break:E0F06C        label:Home
	{ scancode: 0x7D, mod: true,  result: keyResultAlpha(0x92, 0x92)    },  // make:E07D              break:E0F07D        label:Page Up
	{ scancode: 0x71, mod: true,  result: keyResultAlpha(0x93, 0x93)    },  // make:E071              break:E0F071        label:Delete
	{ scancode: 0x69, mod: true,  result: keyResultAlpha(0x94, 0x94)    },  // make:E069              break:E0F069        label:End
	{ scancode: 0x7A, mod: true,  result: keyResultAlpha(0x95, 0x95)    },  // make:E07A              break:E0F07A        label:Page Down
	{ scancode: 0x75, mod: true,  result: keyResultAlpha(0x96, 0x96)    },  // make:E075              break:E0F075        label:Up Arrow
	{ scancode: 0x6B, mod: true,  result: keyResultAlpha(0x97, 0x97)    },  // make:E06B              break:E0F06B        label:Left Arrow
	{ scancode: 0x72, mod: true,  result: keyResultAlpha(0x98, 0x98)    },  // make:E072              break:E0F072        label:Down Arrow
	{ scancode: 0x74, mod: true,  result: keyResultAlpha(0x99, 0x99)    },  // make:E074              break:E0F074        label:Right Arrow
	{ scancode: 0x77, mod: false, result: keyResultNone()               },  // make:77                break:F077          label:Num Lock (numpad)
	{ scancode: 0x4A, mod: true,  result: keyResultAlpha('/',  '/' )    },  // make:E04A              break:E0F04A        label:/ (numpad)
	{ scancode: 0x7C, mod: false, result: keyResultAlpha('*',  '*' )    },  // make:7C                break:F07C          label:* (numpad)
	{ scancode: 0x7B, mod: false, result: keyResultAlpha('-',  '-' )    },  // make:7B                break:F07B          label:- (numpad)
	{ scancode: 0x6C, mod: false, result: keyResultAlpha('7',  '7' )    },  // make:6C                break:F06C          label:7 (numpad)
	{ scancode: 0x75, mod: false, result: keyResultAlpha('8',  '8' )    },  // make:75                break:F075          label:8 (numpad)
	{ scancode: 0x7D, mod: false, result: keyResultAlpha('9',  '9' )    },  // make:7D                break:F07D          label:9 (numpad)
	{ scancode: 0x79, mod: false, result: keyResultAlpha('+',  '+' )    },  // make:79                break:F079          label:+ (numpad)
	{ scancode: 0x6B, mod: false, result: keyResultAlpha('4',  '4' )    },  // make:6B                break:F06B          label:4 (numpad)
	{ scancode: 0x73, mod: false, result: keyResultAlpha('5',  '5' )    },  // make:73                break:F073          label:5 (numpad)
	{ scancode: 0x74, mod: false, result: keyResultAlpha('6',  '6' )    },  // make:74                break:F074          label:6 (numpad)
	{ scancode: 0x69, mod: false, result: keyResultAlpha('1',  '1' )    },  // make:69                break:F069          label:1 (numpad)
	{ scancode: 0x72, mod: false, result: keyResultAlpha('2',  '2' )    },  // make:72                break:F072          label:2 (numpad)
	{ scancode: 0x7A, mod: false, result: keyResultAlpha('3',  '3' )    },  // make:7A                break:F07A          label:3 (numpad)
	{ scancode: 0x70, mod: false, result: keyResultAlpha('0',  '0' )    },  // make:70                break:F070          label:0 (numpad)
	{ scancode: 0x71, mod: false, result: keyResultAlpha('.',  '.' )    },  // make:71                break:F071          label:. (numpad)
	{ scancode: 0x5A, mod: true,  result: keyResultAlpha(0x0D, 0x0D)    },  // make:E05A              break:E0F05A        label:Enter (numpad)
]

main()
