require('./asm.js')
//const romWriter = require('./romWriter.js')

const outerLabel = new Label()
const innerLabel = new Label()
const VAR_X = 0

page(0x80) // put data pointer in a ram page (not rom)
constA(1)
storeA(VAR_X)
	outerLabel.setHere() // 6
loadB(VAR_X)
constA(0)
	innerLabel.setHere() // a
add_into_A()
JNZ(innerLabel)
constA(1)
add_into_A()
storeA(VAR_X)
jump(outerLabel)

compile()

for (let addr = 0; addr < machineCode.length; addr += 1) {
	console.log(machineCode[addr].toString(16))
//	romWriter.write(addr, program[addr])
}
//romWriter.start()
