const argv = require('minimist')(process.argv.slice(2))
const util = require('../util.js')
require('../asm.js')
const uploader = require('./uploader.js')
const leftPad = util.leftPad

const VAR_X = 0

// double incremented upon fetching instruction 01 (from previous instruction 4a) possibly due to current flag state?

//pause()
//pause()
//pause()
//pause()
//pause()
page(0xff) // put data pointer in a ram page (not rom)
output('H')
output('e')
output('l')
output('l')
output('o')
output(' ')
output('W')
output('o')
output('r')
output('l')
output('d')
output('!')
constA(1)
storeA(VAR_X)

________________(l.outerLabel)
loadB(VAR_X)
constA(0)

________________(l.innerLabel)
add_into_A()
//pause()
JNC(l.innerLabel)
outputB()
constA(1)
add_into_A()
//pause()
//pause()
//pause()
//pause()
storeA(VAR_X)
jump(l.outerLabel)

compile()

/*
let str = ''
for (let addr = 0; addr < machineCode.length; addr += 1) {
	if (addr % 16 === 0) {
		if (addr > 0) { str += '\n' }
		str += leftPad(addr.toString(16), 4) + ' |  '
	}
	else if (addr % 4 === 0) {
		str += ' '
	}
	str += leftPad(machineCode[addr].toString(16), 2) + ' '
	//romWriter.write(addr, machineCode[addr])
}
console.log('Compiled:')
console.log(str)
*/

if (!argv.dry) {
	console.log('Uploading...')
	uploader.upload(machineCode)
}


//console.log('[' + machineCode.map(s => '0x' + s.toString(16)).join(', ') + ']')
//

