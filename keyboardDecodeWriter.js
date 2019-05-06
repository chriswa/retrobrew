const util = require('./util.js')
const moveBit = util.moveBit
const argv = require('minimist')(process.argv.slice(2))
const romWriter = require('./romWriter.js')

const chipIndex = argv.chip
if (chipIndex === undefined) {
	throw new Error(`--chip=0..1 must be specified`)
}

function getCorrectedDataForAddress(romIndex, romAddress, debug = false) {
	// ROM address high bits: A11, A10, xx, xx, A12, A8, A9
	// ROM data out bits:       3,   4,  1,  2,   5,  6,  7

	let correctedAddress = 0
	correctedAddress |= moveBit(romAddress, 0, 0)
	correctedAddress |= moveBit(romAddress, 1, 1)
	correctedAddress |= moveBit(romAddress, 2, 2)
	correctedAddress |= moveBit(romAddress, 3, 3)
	correctedAddress |= moveBit(romAddress, 4, 4)
	correctedAddress |= moveBit(romAddress, 5, 5)
	correctedAddress |= moveBit(romAddress, 6, 6)
	correctedAddress |= moveBit(romAddress, 7, 7)
	correctedAddress |= moveBit(romAddress, 11, 8 + 0)
	correctedAddress |= moveBit(romAddress, 10, 8 + 1)
	correctedAddress |= moveBit(romAddress, 12, 8 + 4)
	correctedAddress |= moveBit(romAddress, 8, 8 + 5)
	correctedAddress |= moveBit(romAddress, 9, 8 + 6)

	debug && console.log(`correctedAddress = ${correctedAddress.toString(2)}`)

	let decodeWord = decodeLookup[correctedAddress]

	let outputValue = 0

	if (romIndex === 0) {
		outputValue = decodeWord & 0xff
	}
	else {
		outputValue |= moveBit(decodeWord, 8 + 0, 3)
		outputValue |= moveBit(decodeWord, 8 + 1, 4)
		outputValue |= moveBit(decodeWord, 8 + 2, 1)
		outputValue |= moveBit(decodeWord, 8 + 3, 2)
		outputValue |= moveBit(decodeWord, 8 + 4, 5)
		outputValue |= moveBit(decodeWord, 8 + 5, 6)
		outputValue |= moveBit(decodeWord, 8 + 6, 7)
	}
	return outputValue
}

function writeData() {
	const romIndex = parseInt(chipIndex)
	for (let romAddress = 0; romAddress <= 0x1fff; romAddress += 1) { // 8+5 bits
		romWriter.write(romAddress, getCorrectedDataForAddress(romIndex, romAddress))
	}
}

/*
1pXXXXXXXX0
aaaaaa 1c 00011100
10000111000 11111100000 10000111000 1000011
bbbbbb 32 00110010
10001100100 11111100000 10001100100 1000110
cccccc 21 00100001
11001000010 11111100000 11001000010 1100100
dddddd 23 00100011
10001000110 11111100000 10001000110 1000100



state machine
- current sequence:
	- contains F0 break code?
	- contains E0 modifier code?
	- is the last byte in a sequence (i.e. not F0 or E0)
- long-term memory
	- shift is down
	- ctrl is down
	- alt is down
*/

const NONE = undefined
const BIT_BREAK 	= 0b00000001 // multi-byte state
const BIT_MOD   	= 0b00000010 // multi-byte state
const BIT_DONE  	= 0b00000100 // finish multi-byte
const BIT_OUTPUT	= 0b00001000 // output data to register
const BIT_SHIFT 	= 0b00010000 // multi-keystroke state
const BIT_CTRL  	= 0b00100000 // multi-keystroke state
const BIT_ALT   	= 0b01000000 // multi-keystroke state


//[ 0xF0, BIT_BREAK ],
//[ 0xE0, BIT_MOD ],

const decodeLookup = []

function setRomValuesForKey(keyCode, determineOutputs) {
	for (let iter = 0; iter <= 0b11111; iter += 1) {
		const flags = {
			BREAK: !!(iter & 0b00001),
			MOD:   !!(iter & 0b00010),
			SHIFT: !!(iter & 0b00100),
			CTRL:  !!(iter & 0b01000),
			ALT:   !!(iter & 0b10000),
		}
		let flagValue = 0
		flagValue |= moveBit(iter, 0, 0)
		flagValue |= moveBit(iter, 1, 1)
		flagValue |= moveBit(iter, 2, 4)
		flagValue |= moveBit(iter, 3, 5)
		flagValue |= moveBit(iter, 4, 6)
		let [ascii, flagsOut] = determineOutputs(flags, flagValue)

		if (keyCode == 0x14) { console.log(`  determineOutputs -> ${flagsOut.toString(2)}`) }

		decodeLookup[keyCode | (flagValue << 8)] = ascii | (flagsOut << 8)
	}
}

function main() {
	initDecodeArray()
	writeData()
	
	//const afterLeftShift = getCorrectedDataForAddress(1, 0x12, true)
	//console.log(`afterLeftShift -> ${afterLeftShift.toString(2)}xxxxxxxx`)
	//const afterLeftCtrl  = getCorrectedDataForAddress(1, 0x14 | (1 << 12), true)
	//console.log(`afterLeftCtrl -> ${afterLeftCtrl.toString(2)}xxxxxxxx`)

	const afterLeftCtrl  = 
	console.log(`A          -> ${getCorrectedDataForAddress(0, 0x1C, true).toString(16)}`)
	console.log(`ctrl+A     -> ${getCorrectedDataForAddress(0, 0x1C | (1 << 8), true).toString(16)}`)
	console.log(`alt+A      -> ${getCorrectedDataForAddress(0, 0x1C | (1 << 9), true).toString(16)}`)
	console.log(`ctrl+alt+A -> ${getCorrectedDataForAddress(0, 0x1C | (1 << 8) | (1 << 9), true).toString(16)}`)

	console.log(`numpad 8   -> ${getCorrectedDataForAddress(0, 0x75, true).toString(16)}`)
	console.log(`up(done)   -> ${getCorrectedDataForAddress(0, 0x75 | (1 << 10), true).toString(16)}`)

	if (!argv.dry) {
		romWriter.start()
	}
	/*
	//                        a down, a up,     shift down,   a down, a up,       shift up,         down arrow down, down arrow up
	const sampleScancodes = [ 0x59,    0x1C, 0xF0, 0x1C,    0xF0, 0x59,     0xE0, 0x72, 0xE0, 0xF0, 0x72 ]
	let sampleFlagState = 0
	sampleScancodes.forEach(scancode => {
		console.log(`scancode: ${scancode.toString(16)}`)
		const decodeInput = scancode | (sampleFlagState << 8)
		//console.log(decodeInput.toString(2))
		const result = decodeLookup[ decodeInput ]
		//console.log(result.toString(2))
		const ascii = result & 0xff
		sampleFlagState = result >> 8
		if (sampleFlagState & BIT_OUTPUT) {
			console.log(`OUTPUT: ${ascii.toString(16)} - ${String.fromCharCode(ascii)}`)
		}
		if (sampleFlagState & BIT_DONE) {
			sampleFlagState = sampleFlagState & (BIT_SHIFT | BIT_CTRL | BIT_ALT)
		}
	})
	*/
}
function initDecodeArray() {
	const normalKeysByScancode = {}
	keys.forEach(([keyScancode, keyType, config]) => {
		if (keyType === 'raw' || keyType === 'mod') {
			if (!normalKeysByScancode[keyScancode]) { normalKeysByScancode[keyScancode] = {} }
			normalKeysByScancode[keyScancode][keyType] = config
		}
	})
	for (let unusedScancode = 0; unusedScancode <= 0xff; unusedScancode += 1) {
		setRomValuesForKey(unusedScancode, (flags, flagValue) => {
			let flagsOut = BIT_DONE | (flagValue & (BIT_SHIFT | BIT_CTRL | BIT_ALT))
			return [0, flagsOut]
		})
	}
	for (const keyScancode in normalKeysByScancode) {
		const normalKey = normalKeysByScancode[keyScancode] // { raw: ?{lca, uca}, mod: ?{lca, uca} }
		setRomValuesForKey(keyScancode, (flags, flagValue) => {
			if (keyScancode == 0x14) { console.log(`left ctrl: ${flagValue.toString(2)} ${JSON.stringify(flags)}`) }
			let flagsOut = BIT_DONE | (flagValue & (BIT_SHIFT | BIT_CTRL | BIT_ALT))
			const config = normalKey[flags.MOD ? 'mod' : 'raw']
			if (config && 'upper' in config) {
				if (flags.BREAK) { return [0, flagsOut] }
				if (!config) { return [0, flagsOut] }
				let ascii = config[flags.SHIFT ? 'upper' : 'lower']

				if (ascii === undefined) { return [0, flagsOut] }
				if (typeof(ascii) === 'string') { ascii = ascii.charCodeAt(0) }

				if (flags.CTRL) { ascii += 0x80 }
				if (flags.ALT) { ascii -= 81; }
				while (ascii < 0x00) { ascii += 256 }
				while (ascii > 0xff) { ascii -= 256 }
				return [ascii, BIT_OUTPUT | flagsOut]
			}
			else if (config && 'toggle' in config) {
				const toggleBit = config.toggle
				if (flags.BREAK) { return [0, flagsOut & (~toggleBit)] }
				else { return [0, flagsOut | toggleBit] }
			}
			else {
				return [0, flagsOut]
			}
		})
	}
	setRomValuesForKey(0xF0, (flags, flagValue) => { // 0xF0 = break code
		return [0, flagValue | BIT_BREAK]
	})
	setRomValuesForKey(0xE0, (flags, flagValue) => { // 0xE0 = mod code
		return [0, flagValue | BIT_MOD]
	})
	setRomValuesForKey(0xAA, (flags, flagValue) => { // 0xAA = self-test success (e.g. after power on)
		return [0, 0] // use this to reset shift/ctrl/alt flip-flops which power up HIGH
	})
}

const keys = [
	// https://techdocs.altium.com/display/FPGA/PS2+Keyboard+Scan+Codes
	// [ input (byte | state), output byte (without shift), output byte (with shift) ]
	// n.b. ascii outputs 0x80..0x99 are arbitrarily chosen (they also correspond to blank glyphs in the 2004 LCD)
	[ 0x76, 'raw',	{ lower: 0x80,      	upper: 0x80,     	} ],	// make:76              	break:F076        	label:ESC
	[ 0x05, 'raw',	{ lower: 0x81,      	upper: 0x81,     	} ],	// make:05              	break:F005        	label:F1
	[ 0x06, 'raw',	{ lower: 0x82,      	upper: 0x82,     	} ],	// make:06              	break:F006        	label:F2
	[ 0x04, 'raw',	{ lower: 0x83,      	upper: 0x83,     	} ],	// make:04              	break:F004        	label:F3
	[ 0x0C, 'raw',	{ lower: 0x84,      	upper: 0x84,     	} ],	// make:0C              	break:F00C        	label:F4
	[ 0x03, 'raw',	{ lower: 0x85,      	upper: 0x85,     	} ],	// make:03              	break:F003        	label:F5
	[ 0x0B, 'raw',	{ lower: 0x86,      	upper: 0x86,     	} ],	// make:0B              	break:F00B        	label:F6
	[ 0x83, 'raw',	{ lower: 0x87,      	upper: 0x87,     	} ],	// make:83              	break:F083        	label:F7
	[ 0x0A, 'raw',	{ lower: 0x88,      	upper: 0x88,     	} ],	// make:0A              	break:F00A        	label:F8
	[ 0x01, 'raw',	{ lower: 0x89,      	upper: 0x89,     	} ],	// make:01              	break:F001        	label:F9
	[ 0x09, 'raw',	{ lower: 0x8A,      	upper: 0x8A,     	} ],	// make:09              	break:F009        	label:F10
	[ 0x78, 'raw',	{ lower: 0x8B,      	upper: 0x8B,     	} ],	// make:78              	break:F078        	label:F11
	[ 0x07, 'raw',	{ lower: 0x8C,      	upper: 0x8C,     	} ],	// make:07              	break:F007        	label:F12
	[ 0x7C, 'mod',	{ lower: 0x8D,      	upper: 0x8D,     	} ],	// make:E012E07C        	break:E0F07CE0F012	label:Prt Scr
	[ 0x7E, 'raw',	{ lower: 0x8E,      	upper: 0x8E,     	} ],	// make:7E              	break:F07E        	label:Scroll Lock
	[ 0xE1, 'raw',	{ lower: 0x8F,      	upper: 0x8F,     	} ],	// make:E11477E1F014E077	break:None        	label:Pause/Break
	[ 0x0E, 'raw',	{ lower: '`',       	upper: '~',      	} ],	// make:0E              	break:F00E        	label:`
	[ 0x16, 'raw',	{ lower: '1',       	upper: '!',      	} ],	// make:16              	break:F016        	label:1
	[ 0x1E, 'raw',	{ lower: '2',       	upper: '@',      	} ],	// make:1E              	break:F01E        	label:2
	[ 0x26, 'raw',	{ lower: '3',       	upper: '#',      	} ],	// make:26              	break:F026        	label:3
	[ 0x25, 'raw',	{ lower: '4',       	upper: '$',      	} ],	// make:25              	break:F025        	label:4
	[ 0x2E, 'raw',	{ lower: '5',       	upper: '%',      	} ],	// make:2E              	break:F02E        	label:5
	[ 0x36, 'raw',	{ lower: '6',       	upper: '^',      	} ],	// make:36              	break:F036        	label:6
	[ 0x3D, 'raw',	{ lower: '7',       	upper: '&',      	} ],	// make:3D              	break:F03D        	label:7
	[ 0x3E, 'raw',	{ lower: '8',       	upper: '*',      	} ],	// make:3E              	break:F03E        	label:8
	[ 0x46, 'raw',	{ lower: '9',       	upper: '(',      	} ],	// make:46              	break:F046        	label:9
	[ 0x45, 'raw',	{ lower: '0',       	upper: ')',      	} ],	// make:45              	break:F045        	label:0
	[ 0x4E, 'raw',	{ lower: '-',       	upper: '_',      	} ],	// make:4E              	break:F04E        	label:-
	[ 0x55, 'raw',	{ lower: '=',       	upper: '+',      	} ],	// make:55              	break:F055        	label:=
	[ 0x66, 'raw',	{ lower: 0x08,      	upper: 0x08,     	} ],	// make:66              	break:F066        	label:Backspace
	[ 0x0D, 'raw',	{ lower: 0x09,      	upper: 0x09,     	} ],	// make:0D              	break:F00D        	label:Tab
	[ 0x15, 'raw',	{ lower: 'q',       	upper: 'Q',      	} ],	// make:15              	break:F015        	label:Q
	[ 0x1D, 'raw',	{ lower: 'w',       	upper: 'W',      	} ],	// make:1D              	break:F01D        	label:W
	[ 0x24, 'raw',	{ lower: 'e',       	upper: 'E',      	} ],	// make:24              	break:F024        	label:E
	[ 0x2D, 'raw',	{ lower: 'r',       	upper: 'R',      	} ],	// make:2D              	break:F02D        	label:R
	[ 0x2C, 'raw',	{ lower: 't',       	upper: 'T',      	} ],	// make:2C              	break:F02C        	label:T
	[ 0x35, 'raw',	{ lower: 'y',       	upper: 'Y',      	} ],	// make:35              	break:F035        	label:Y
	[ 0x3C, 'raw',	{ lower: 'u',       	upper: 'U',      	} ],	// make:3C              	break:F03C        	label:U
	[ 0x43, 'raw',	{ lower: 'i',       	upper: 'I',      	} ],	// make:43              	break:F043        	label:I
	[ 0x44, 'raw',	{ lower: 'o',       	upper: 'O',      	} ],	// make:44              	break:F044        	label:O
	[ 0x4D, 'raw',	{ lower: 'p',       	upper: 'P',      	} ],	// make:4D              	break:F04D        	label:P
	[ 0x54, 'raw',	{ lower: '[',       	upper: '{',      	} ],	// make:54              	break:F054        	label:[
	[ 0x5B, 'raw',	{ lower: ']',       	upper: '}',      	} ],	// make:5B              	break:F05B        	label:]
	[ 0x5D, 'raw',	{ lower: '\\',      	upper: '|',      	} ],	// make:5D              	break:F05D        	label:\
	[ 0x58, 'raw',	{                   	                 	} ],	// make:58              	break:F058        	label:Caps Lock
	[ 0x1C, 'raw',	{ lower: 'a',       	upper: 'A',      	} ],	// make:1C              	break:F01C        	label:A
	[ 0x1B, 'raw',	{ lower: 's',       	upper: 'S',      	} ],	// make:1B              	break:F01B        	label:S
	[ 0x23, 'raw',	{ lower: 'd',       	upper: 'D',      	} ],	// make:23              	break:F023        	label:D
	[ 0x2B, 'raw',	{ lower: 'f',       	upper: 'F',      	} ],	// make:2B              	break:F02B        	label:F
	[ 0x34, 'raw',	{ lower: 'g',       	upper: 'G',      	} ],	// make:34              	break:F034        	label:G
	[ 0x33, 'raw',	{ lower: 'h',       	upper: 'H',      	} ],	// make:33              	break:F033        	label:H
	[ 0x3B, 'raw',	{ lower: 'j',       	upper: 'J',      	} ],	// make:3B              	break:F03B        	label:J
	[ 0x42, 'raw',	{ lower: 'k',       	upper: 'K',      	} ],	// make:42              	break:F042        	label:K
	[ 0x4B, 'raw',	{ lower: 'l',       	upper: 'L',      	} ],	// make:4B              	break:F04B        	label:L
	[ 0x4C, 'raw',	{ lower: ';',       	upper: ':',      	} ],	// make:4C              	break:F04C        	label:;
	[ 0x52, 'raw',	{ lower: "'",       	upper: '"',      	} ],	// make:52              	break:F052        	label:'
	[ 0x5A, 'raw',	{ lower: 0x0D,      	upper: 0x0D,     	} ],	// make:5A              	break:F05A        	label:Enter
	[ 0x12, 'raw',	{ toggle: BIT_SHIFT,	                 	} ],	// make:12              	break:F012        	label:Shift (left)
	[ 0x1A, 'raw',	{ lower: 'z',       	upper: 'Z',      	} ],	// make:1A              	break:F01A        	label:Z
	[ 0x22, 'raw',	{ lower: 'x',       	upper: 'X',      	} ],	// make:22              	break:F022        	label:X
	[ 0x21, 'raw',	{ lower: 'c',       	upper: 'C',      	} ],	// make:21              	break:F021        	label:C
	[ 0x2A, 'raw',	{ lower: 'v',       	upper: 'V',      	} ],	// make:2A              	break:F02A        	label:V
	[ 0x32, 'raw',	{ lower: 'b',       	upper: 'B',      	} ],	// make:32              	break:F032        	label:B
	[ 0x31, 'raw',	{ lower: 'n',       	upper: 'N',      	} ],	// make:31              	break:F031        	label:N
	[ 0x3A, 'raw',	{ lower: 'm',       	upper: 'M',      	} ],	// make:3A              	break:F03A        	label:M
	[ 0x41, 'raw',	{ lower: ',',       	upper: '<',      	} ],	// make:41              	break:F041        	label:,
	[ 0x49, 'raw',	{ lower: '.',       	upper: '>',      	} ],	// make:49              	break:F049        	label:.
	[ 0x4A, 'raw',	{ lower: '/',       	upper: '?',      	} ],	// make:4A              	break:F04A        	label:/
	[ 0x59, 'raw',	{ toggle: BIT_SHIFT,	                 	} ],	// make:59              	break:F059        	label:Shift (right)
	[ 0x14, 'raw',	{ toggle: BIT_CTRL, 	                 	} ],	// make:14              	break:F014        	label:Ctrl (left)
	[ 0x1F, 'mod',	{                   	                 	} ],	// make:E01F            	break:E0F01F      	label:Windows (left)
	[ 0x11, 'raw',	{ toggle: BIT_ALT,  	                 	} ],	// make:11              	break:F011        	label:Alt (left)
	[ 0x29, 'raw',	{ lower: ' ',       	upper: ' ',      	} ],	// make:29              	break:F029        	label:Spacebar
	[ 0x11, 'mod',	{ toggle: BIT_ALT,  	                 	} ],	// make:E011            	break:E0F011      	label:Alt (right)
	[ 0x27, 'mod',	{                   	                 	} ],	// make:E027            	break:E0F027      	label:Windows (right)
	[ 0x2F, 'mod',	{                   	                 	} ],	// make:E02F            	break:E0F02F      	label:Menus
	[ 0x14, 'mod',	{ toggle: BIT_CTRL, 	                 	} ],	// make:E014            	break:E0F014      	label:Ctrl (right)
	[ 0x70, 'mod',	{ lower: 0x90,      	upper: 0x90,     	} ],	// make:E070            	break:E0F070      	label:Insert
	[ 0x6C, 'mod',	{ lower: 0x91,      	upper: 0x91,     	} ],	// make:E06C            	break:E0F06C      	label:Home
	[ 0x7D, 'mod',	{ lower: 0x92,      	upper: 0x92,     	} ],	// make:E07D            	break:E0F07D      	label:Page Up
	[ 0x71, 'mod',	{ lower: 0x93,      	upper: 0x93,     	} ],	// make:E071            	break:E0F071      	label:Delete
	[ 0x69, 'mod',	{ lower: 0x94,      	upper: 0x94,     	} ],	// make:E069            	break:E0F069      	label:End
	[ 0x7A, 'mod',	{ lower: 0x95,      	upper: 0x95,     	} ],	// make:E07A            	break:E0F07A      	label:Page Down
	[ 0x75, 'mod',	{ lower: 0x96,      	upper: 0x96,     	} ],	// make:E075            	break:E0F075      	label:Up Arrow
	[ 0x6B, 'mod',	{ lower: 0x97,      	upper: 0x97,     	} ],	// make:E06B            	break:E0F06B      	label:Left Arrow
	[ 0x72, 'mod',	{ lower: 0x98,      	upper: 0x98,     	} ],	// make:E072            	break:E0F072      	label:Down Arrow
	[ 0x74, 'mod',	{ lower: 0x99,      	upper: 0x99,     	} ],	// make:E074            	break:E0F074      	label:Right Arrow
	[ 0x77, 'raw',	{                   	                 	} ],	// make:77              	break:F077        	label:Num Lock (numpad)
	[ 0x4A, 'mod',	{ lower: '/',       	upper: '/',      	} ],	// make:E04A            	break:E0F04A      	label:/ (numpad)
	[ 0x7C, 'raw',	{ lower: '*',       	upper: '*',      	} ],	// make:7C              	break:F07C        	label:* (numpad)
	[ 0x7B, 'raw',	{ lower: '-',       	upper: '-',      	} ],	// make:7B              	break:F07B        	label:- (numpad)
	[ 0x6C, 'raw',	{ lower: '7',       	upper: '7',      	} ],	// make:6C              	break:F06C        	label:7 (numpad)
	[ 0x75, 'raw',	{ lower: '8',       	upper: '8',      	} ],	// make:75              	break:F075        	label:8 (numpad)
	[ 0x7D, 'raw',	{ lower: '9',       	upper: '9',      	} ],	// make:7D              	break:F07D        	label:9 (numpad)
	[ 0x79, 'raw',	{ lower: '+',       	upper: '+',      	} ],	// make:79              	break:F079        	label:+ (numpad)
	[ 0x6B, 'raw',	{ lower: '4',       	upper: '4',      	} ],	// make:6B              	break:F06B        	label:4 (numpad)
	[ 0x73, 'raw',	{ lower: '5',       	upper: '5',      	} ],	// make:73              	break:F073        	label:5 (numpad)
	[ 0x74, 'raw',	{ lower: '6',       	upper: '6',      	} ],	// make:74              	break:F074        	label:6 (numpad)
	[ 0x69, 'raw',	{ lower: '1',       	upper: '1',      	} ],	// make:69              	break:F069        	label:1 (numpad)
	[ 0x72, 'raw',	{ lower: '2',       	upper: '2',      	} ],	// make:72              	break:F072        	label:2 (numpad)
	[ 0x7A, 'raw',	{ lower: '3',       	upper: '3',      	} ],	// make:7A              	break:F07A        	label:3 (numpad)
	[ 0x70, 'raw',	{ lower: '0',       	upper: '0',      	} ],	// make:70              	break:F070        	label:0 (numpad)
	[ 0x71, 'raw',	{ lower: '.',       	upper: '.',      	} ],	// make:71              	break:F071        	label:. (numpad)
	[ 0x5A, 'mod',	{ lower: 0x0D,      	upper: 0x0D,     	} ],	// make:E05A            	break:E0F05A      	label:Enter (numpad)
]

main()
