const argv = require('minimist')(process.argv.slice(2))
const romWriter = require('./romWriter.js')

console.log(argv)

const script = argv._[0]
if (script === undefined) {
	throw new Error(`first argument (script) must be defined`)
}

const offset = argv.offset ? parseInt(argv.offset, 16) : 0


console.log(script)
require('./' + script)

console.log(`machineCode.length = ${machineCode.length.toString(16)}`)

for (let addr = 0; addr < machineCode.length; addr += 1) {
	const fullAddr = addr + offset
	//console.log(fullAddr.toString(16) + ' := ' + machineCode[addr].toString(16))
	romWriter.write(fullAddr, machineCode[addr])
}

if (!argv.dry) {
	romWriter.start()
}
