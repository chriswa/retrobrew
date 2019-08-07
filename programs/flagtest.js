const argv = require('minimist')(process.argv.slice(2))
const util = require('../util.js')
require('../asm.js')
const uploader = require('./uploader.js')
const leftPad = util.leftPad

const outerLabel = new Label()
const innerLabel = new Label()
const VAR_X = 0

function print(str) { str.split('').forEach(c => output(c)) }

lcdCtrl(0x01) // Clear
lcdCtrl(0x0f) // Display On, Cursor On, Blinking On
lcdCtrl(0b00111000)
//outerLabel.setHere()
//jump(outerLabel)

print('Flags? ')
//halt()

constA(241)
constB(199)
add_into_A()

const labelC = new Label()
const labelC1 = new Label()
JNC(labelC)
print('C ')
jump(labelC1)
labelC.setHere()
print('NC ')
labelC1.setHere()

const labelZ = new Label()
const labelZ1 = new Label()
JNZ(labelZ)
print('Z ')
jump(labelZ1)
labelZ.setHere()
print('NZ ')
labelZ1.setHere()

halt()

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

