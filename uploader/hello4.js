const argv = require('minimist')(process.argv.slice(2))
const util = require('../util.js')
require('../asm.js')
const uploader = require('./uploader.js')
const leftPad = util.leftPad

const outerLabel = new Label()

function print(str) { str.split('').forEach(c => output(c)) }

lcdCtrl(0x01) // Clear
lcdCtrl(0x0f) // Display On, Cursor On, Blinking On
lcdCtrl(0b00111000)
lbl("top").setHere()
print('Hello world!  ')

page(0xff)
constA(17)
constB(200)
add_into_A()
storeA(0)

print('0x')

constB(0xf0)
//halt()
and_into_A()
shrA_into_A()
shrA_into_A()
shrA_into_A()
shrA_into_A()
constB(10)
sub_into_B()
JC(lbl('hex1'))
constB('0'.charCodeAt(0))
jump(lbl('ascii1'))
lbl('hex1').setHere()
constB('A'.charCodeAt(0) - 10)
lbl('ascii1').setHere()
add_into_A()
outputA()

loadA(0)
constB(0x0f)
and_into_A()
constB(10)
sub_into_B()
JC(lbl('hex2'))
constB('0'.charCodeAt(0))
jump(lbl('ascii2'))
lbl('hex2').setHere()
constB('A'.charCodeAt(0) - 10)
lbl('ascii2').setHere()
add_into_A()
outputA()

lcdCtrl(0x01) // Clear


jump(lbl("top"))

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

