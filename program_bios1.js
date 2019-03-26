const argv = require('minimist')(process.argv.slice(2))
require('./asm.js')
const romWriter = require('./romWriter.js')

const modeSelectLabel = new Label()
const ramWriteLabel = new Label()
const VAR_X = 0

// set data address to start of RAM
page(0x80)

// wait for keyboard input
modeSelectLabel.setHere()
JNK(modeSelectLabel)
keyboardA()

// compare with 'x' (execute)
constB('x'.charCodeAt(0))
sub_into_A() // XXX: hmm, this kinda sucks that i need to overwrite A! i think i need a "compare" instruction which does an ALU subtract but only writes to the flags register
JZ(ramWriteLabel)

// if 'x'
jumpFar(0x80, 0x00)

// wait for keyboard input
ramWriteLabel.setHere()
JNK(ramWriteLabel)
storeKbdIncA()
jump(ramWriteLabel) // loop indefinitely: programmer will assert master reset to execute their program!

// extra byte to workaround romWriter bug?!
constA(255)


compile()

for (let addr = 0; addr < machineCode.length; addr += 1) {
	console.log(addr.toString(16) + ' := ' + machineCode[addr].toString(16))
	romWriter.write(addr, machineCode[addr])
}

if (!argv.dry) {
	romWriter.start()
}
