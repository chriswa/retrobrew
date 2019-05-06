const argv = require('minimist')(process.argv.slice(2))
require('./asm.js')
const romWriter = require('./romWriter.js')
const lcd = require('./lcd.js')



	noop()
	lcd.init()
	JNK(l.showMenu)

here(l.waitForInput)
	JNKA(l.waitForInput)

	constB('p'.charCodeAt(0)); cmp(); JZ(l.programmingMode)
	constB('x'.charCodeAt(0)); cmp(); JZ(l.executeMode)
	constB('r'.charCodeAt(0)); cmp(); JZ(l.rot13)
	jump(l.waitForInput)

here(l.showMenu)
	lcd.print('Mode?')
	lcd.moveCursor(1)
	lcd.print('(p)rogram')
	lcd.moveCursor(2)
	lcd.print('e(x)ecute')
	lcd.moveCursor(3)
	lcd.print('(r)ot13')
	jump(l.waitForInput)

here(l.programmingMode)
	lcd.clear()
	lcd.print('Programming...')
	page(0x80)
here(l.ramWrite)
	JNK(l.ramWrite)
	storeKbdInc()
	jump(l.ramWrite) // n.b. reset computer to exit programming mode

here(l.executeMode)
	lcd.clear()
	jumpFar(0x80, 0x00)

here(l.rot13)
	lcd.clear()
	jumpFar(0x01, 0x00)

// extra bytes to workaround romWriter bug?!
constA(255)


compile()

for (let addr = 0; addr < machineCode.length; addr += 1) {
	console.log(addr.toString(16) + ' := ' + machineCode[addr].toString(16))
	romWriter.write(addr, machineCode[addr])
}

if (!argv.dry) {
	romWriter.start()
}
