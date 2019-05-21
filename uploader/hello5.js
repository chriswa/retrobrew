const argv = require('minimist')(process.argv.slice(2))
const util = require('../util.js')
require('../asm.js')
const uploader = require('./uploader.js')
const leftPad = util.leftPad

function print(str) { str.split('').forEach(c => output(c)) }

lcdCtrl(0x01) // Clear
lcdCtrl(0x0f) // Display On, Cursor On, Blinking On
lcdCtrl(0b00111000)
print('    Hello Lauren!   ')
lcdCtrl(0xC0)
print('      <3    <3      ')
lcdCtrl(0xD4)
print('      <3    <3      ')


________________(l.outerLabel)

lcdCtrl(0x94)
print(' <3  I love you  <3 ')

constA(255)
________________(l.wait1)
decA_into_A()
JNZ(l.wait1)


lcdCtrl(0x94)
print('<3   I love you   <3')

constA(255)
________________(l.wait2)
decA_into_A()
JNZ(l.wait2)

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

