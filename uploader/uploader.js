const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const util = require('../util.js')

const resetInstruction = Symbol('resetInstruction')

//let buffer = [
//	// hello2, adjusted to use ram page 0x81 for data storage
//	//0x80, 0x81, 0x01, 0x01, 0x13, 0x00, 0x04, 0x00, 0x01, 0x00, 0x20, 0x00, 0x46, 0x0a, 0x01, 0x01, 0x20, 0x00, 0x00, 0x00, 0x00, 0x13, 0x00, 0x40, 0x06,
//	//0x0, 0x80, 0x81, 0x70, 0x48, 0x70, 0x65, 0x70, 0x6c, 0x70, 0x6c, 0x70, 0x6f, 0x70, 0x20, 0x70, 0x77, 0x70, 0x6f, 0x70, 0x72, 0x70, 0x6c, 0x70, 0x64, 0x70, 0x21, 0x1, 0x1, 0x13, 0x0, 0x4, 0x0, 0x1, 0x0, 0x20, 0x0, 0x46, 0x23, 0x1, 0x1, 0x20, 0x0, 0x0, 0x0, 0x0, 0x13, 0x0, 0x40, 0x1f, 0x40, 0x1f,
//	0x0, 0x0, 0x0, 0x0, 0x80, 0x81, 0x70, 0x48, 0x70, 0x65, 0x70, 0x6c, 0x70, 0x6c, 0x70, 0x6f, 0x70, 0x20, 0x70, 0x77, 0x70, 0x6f, 0x70, 0x72, 0x70, 0x6c, 0x70, 0x64, 0x70, 0x21, 0x1, 0x1, 0x13, 0x0, 0x4, 0x0, 0x1, 0x0, 0x20, 0x0, 0x4a, 0x26, 0x1, 0x1, 0x20, 0x0, 0x0, 0x0, 0x0, 0x13, 0x0, 0x40, 0x22, 0x40, 0x22
//	//0x80, 0xff, 0x70, 0x48, 0x70, 0x65, 0x70, 0x6c, 0x70, 0x6c, 0x70, 0x6f, 0x70, 0x20, 0x70, 0x77, 0x70, 0x6f, 0x70, 0x72, 0x70, 0x6c, 0x70, 0x64, 0x70, 0x21, 0x1, 0x1, 0x13, 0x0, 0x4, 0x0, 0x1, 0x0, 0x20, 0x0, 0x4a, 0x22, 0x1, 0x1, 0x20, 0x0, 0x0, 0x0, 0x0, 0x13, 0x0, 0x40, 0x1e, 0x40, 0x1e
//]

let port

module.exports.upload = function(machineCode, interactiveModeWhenFinished = false) {

	const buffer = [
		resetInstruction,
		char('p'),      // select programming mode
		...machineCode,
		0xff,               // an extra byte to allow completion of the intervening instructions which write to ram for the good bytes before this one
		resetInstruction,   // reset after keyboard buffer has finished being output to bus (but probably before the bios has a chance to write it to ram)
		char('x'),      // select execution mode
	]

	console.log('Waiting for "READY" from arduino!')

	port = new SerialPort('COM4', { baudRate: 57600 })
	port.on("open", () => {
		console.log('serial port open')
		//nextStep()
	})

	const parser = port.pipe(new Readline({ delimiter: '\n' }))
	parser.on('data', data => {
		let matches
		if (data === 'READY\r') {
			console.log('<arduino> READY')
			console.log('Arduino just powered up, starting to program...')
			nextStep()
		}
		else if (matches = data.match(/^m: ([0-9A-F]{1,2})\r/)) {
			const byte = parseInt(matches[1], 16)
			const printable = (byte >= 32 && byte < 127) ? String.fromCharCode(byte) : '?'
			console.log(`<arduino> MONITOR OUTPUT: 0x${util.leftPad(byte.toString(16), 2)}: ${printable}`)
		}
		else if (matches = data.match(/^k: ([0-9A-F]{1,2})\r/)) {
			const byte = parseInt(matches[1], 16)
			console.log(`<arduino> KEYBOARD READ: ${byte.toString(16)}: ${String.fromCharCode(byte)}`)
			nextStep()
		}
		else {
			console.log('<arduino> ' + data)
		}
	})

	function reset() {
		console.log("Sending master reset request!")
		port.write([ char('R') ], (err) => {
			if (err) { console.log('Error on write: ', err.message); process.exit() }
		})
	}

	function nextStep() {
		if (buffer.length) {
			const nextBufferElement = buffer.shift()
			if (nextBufferElement === resetInstruction) {
				reset()
				nextStep()
			}
			else {
				const nextByte = nextBufferElement
				console.log(`Sending keyboard byte: 0x${util.leftPad(nextByte.toString(16), 2)}`)
				port.write([char('k'), nextByte], (err) => {
					if (err) { console.log('Error on write: ', err.message); process.exit() }
				})
			}
		}
		else {
			if (interactiveModeWhenFinished) {
				startInteractiveMode()
			}
		}
	}

}

function char(s) {
	return s.charCodeAt(0)
}

let interactiveModeStarted = false
function startInteractiveMode() {
	if (interactiveModeStarted) { return }
	interactiveModeStarted = true

	const readline = require('readline')
	readline.emitKeypressEvents(process.stdin)
	process.stdin.setRawMode(true)
	process.stdin.on('keypress', (str, key) => {
		if (key.ctrl && key.name === 'c') {
			process.exit()
		}
		else {
			if (str) {
				console.log(`uploader interactiveMode: ${str} ${JSON.stringify(key)}`)
				port.write([char('k'), char(str)], (err) => {
					if (err) { console.log('Error on write: ', err.message); process.exit() }
				})
			}
			else {
				console.log(`uploader interactiveMode: keypress !str, key is ${JSON.stringify(key)}`)
			}
		}
	})
}
module.exports.startInteractiveMode = startInteractiveMode


