const argv = require('minimist')(process.argv.slice(2))
require('./asm.js')
const romWriter = require('./romWriter.js')

const outerLabel = new Label()
const innerLabel = new Label()
const VAR_X = 0

page(0xff) // put data pointer in a ram page (not rom)
output('H'.charCodeAt(0))
output('e'.charCodeAt(0))
output('l'.charCodeAt(0))
output('l'.charCodeAt(0))
output('o'.charCodeAt(0))
output(' '.charCodeAt(0))
output('w'.charCodeAt(0))
output('o'.charCodeAt(0))
output('r'.charCodeAt(0))
output('l'.charCodeAt(0))
output('d'.charCodeAt(0))
output('!'.charCodeAt(0))
constA(1)
storeA(VAR_X)
	outerLabel.setHere()
loadB(VAR_X)
constA(0)
	innerLabel.setHere()
add_into_A()
pause()
JNC(innerLabel)
constA(1)
add_into_A()
pause()
pause()
pause()
pause()
storeA(VAR_X)
jump(outerLabel)
jump(outerLabel)

compile()

console.log('[' + machineCode.map(s => '0x' + s.toString(16)).join(', ') + ']')

for (let addr = 0; addr < machineCode.length; addr += 1) {
	console.log(addr.toString(16) + ' := ' + machineCode[addr].toString(16))
	//romWriter.write(addr, machineCode[addr])
}

if (!argv.dry) {
	//romWriter.start()
}
