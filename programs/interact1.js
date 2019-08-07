const argv = require('minimist')(process.argv.slice(2))
const util = require('../util.js')
require('../asm.js')
const uploader = require('./uploader.js')
const leftPad = util.leftPad

const outerLabel = new Label()

const lcd = require('./lcd.js')

lcd.init()

lcd.print("RetrobrewOS v0.0.1")
lcd.moveCursor(1)
lcd.print("> ")




lcd.moveCursor(1, 2)

page(0xff)
constA(2)
storeA(0)

lbl('input').setHere()
JNK(lbl('input'))

keyboardA()

constB(8); sub_into_B() // cmp(8)
JZ(lbl('backspace'))


outputA()

loadA(0); constB(1); add_into_A(); storeA(0) // inc x

jump(lbl('input'))

lbl('backspace').setHere()

loadA(0); constB(1); sub_into_A(); storeA(0) // dec x

constB(0xC0)
add_into_A()
lcdCtrlA()
lcd.print(" ")
lcdCtrlA()

jump(lbl('input'))

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

