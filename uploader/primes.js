const argv = require('minimist')(process.argv.slice(2))
const util = require('../util.js')
require('../asm.js')
const uploader = require('./uploader.js')
const leftPad = util.leftPad

const skipOutputLabel = new Label()
const initLoopLabel = new Label()
const startOverLabel = new Label()
const addAgainLabel = new Label()
const finishedThisMultipleLabel = new Label()
const checkIfBIsPrimeLabel = new Label()
const finishedLabel = new Label()

pause()
page(0xff) // put data pointer in a ram page (not rom)

startOverLabel.setHere()

// set 0xff00..0xffff to 0
constB(0)
constA(0)
initLoopLabel.setHere()
AstoreB()
incA_into_A()
JNC(initLoopLabel)

constB(2)
checkIfBIsPrimeLabel.setHere()
BloadA()
incA_into_A() // not ideal
decA_into_A() // not ideal
JNZ(skipOutputLabel)
outputB()
skipOutputLabel.setHere()

BmovA()
addAgainLabel.setHere()
add_into_A()
JC(finishedThisMultipleLabel)
AstoreB()
jump(addAgainLabel)

finishedThisMultipleLabel.setHere()
BmovA()
incA_into_B()
JC(finishedLabel)
jump(checkIfBIsPrimeLabel)

finishedLabel.setHere()
output(0)
jump(startOverLabel)


compile()

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

if (!argv.dry) {
	console.log('Uploading...')
	uploader.upload(machineCode)
}


//console.log('[' + machineCode.map(s => '0x' + s.toString(16)).join(', ') + ']')
//

