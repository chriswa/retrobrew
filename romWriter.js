const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')

const commands = []

module.exports.write = (address, data) => {
	commands.push(['w', address >> 8, address & 0xff, data])
}

module.exports.dump = (addr0, addr1) => {
	commands.push(['r', addr0 >> 8, addr0 & 0xff, addr1 >> 8, addr1 & 0xff])
}

module.exports.start = () => {
	const totalCommands = commands.length

	const port = new SerialPort('COM4', { baudRate: 57600 })
	port.on("open", () => { console.log('serial port open') })

	const parser = port.pipe(new Readline({ delimiter: '\n' }))
	parser.on('data', data => {
		if (data === 'READY\r') {
			//console.log('READY')
			if (!commands.length) { console.log('All commands processed. Exiting!'); process.exit() }
			const nextCommand = commands.shift().map(el => {
				return typeof el === 'string' ? el.charCodeAt(0) : el
			})
			//console.log(nextCommand)
			console.log(1 - (commands.length / totalCommands))
			port.write(nextCommand, (err) => {
				if (err) { console.log('Error on write: ', err.message); process.exit() }
				//console.log('message written')
			})
		}
		else {
			console.log('<arduino> ' + data)
		}
	})
}