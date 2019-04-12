const argv = require('minimist')(process.argv.slice(2))
require('./asm.js')
const romWriter = require('./romWriter.js')

const modeSelectLabel = new Label()
const jumpToRamLabel = new Label()
const ramWriteLabel = new Label()
const VAR_X = 0

noop()
noop()


JNK(jumpToRamLabel)

// set data address to start of RAM
page(0x80)

//lcdCtrl(0x01) // Clear
//lcdCtrl(0x0f) // Display On, Cursor On, Blinking On
//lcdCtrl(0b00111000)
//'Programming RAM...'.split('').forEach(char => output(char))

// wait for keyboard input
//modeSelectLabel.setHere()
//JNK(modeSelectLabel)
//keyboardA()

// compare with 'x' (execute)
//constB('x'.charCodeAt(0))
//sub_into_A() // XXX: hmm, this kinda sucks that i need to overwrite A! i think i need a "compare" instruction which does an ALU subtract but only writes to the flags register
//page(0x80)
//JZ(ramWriteLabel)

// wait for keyboard input
ramWriteLabel.setHere()
JNK(ramWriteLabel) // hot loop, waiting for keyboard input
storeKbdInc()
jump(ramWriteLabel) // loop indefinitely: programmer is expected to assert master reset to execute their program

jumpToRamLabel.setHere()
jumpFar(0x80, 0x00)

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
