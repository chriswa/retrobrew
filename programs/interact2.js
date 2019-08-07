const argv = require('minimist')(process.argv.slice(2))
const util = require('../util.js')
require('../asm.js')
const uploader = require('./uploader.js')
const leftPad = util.leftPad
const lcd = require('./lcd.js')

const INPUT_LINE = 1
const OUTPUT_LINE = 3

lcd.init()

lcd.print("rot13")
lcd.moveCursor(2)
lcd.print("Out:")




lbl('startOver').setHere()
lcd.moveCursor(INPUT_LINE)

page(0xff)
const INPUT_LENGTH_VAR_LOC = 0xff
constA(0)
storeA(INPUT_LENGTH_VAR_LOC)

lbl('waitForKeystroke').setHere()
loadA(INPUT_LENGTH_VAR_LOC) // TODO: debug output
JNK(lbl('waitForKeystroke'))

keyboardA()

constB(8); sub_into_B() // cmp(8)
JZ(lbl('backspace'))

constB(0x0d); sub_into_B() // cmp(0x0d)
JZ(lbl('enter'))

// not a control key...
// store key in buffer (this may overrun by one byte!)
loadB(INPUT_LENGTH_VAR_LOC)
BstoreA()
// check for buffer overflow
loadA(INPUT_LENGTH_VAR_LOC)
constB(19); sub_into_B() // cmp(19)
JZ(lbl('waitForKeystroke')) // ignore keystroke
// accepted keystroke? load and display it!
AloadB()
outputB()
// inc x
loadA(INPUT_LENGTH_VAR_LOC) // TODO: testing
constB(1)
add_into_A()
storeA(INPUT_LENGTH_VAR_LOC)
// wait for next keystroke
jump(lbl('waitForKeystroke'))

// user hit backspace...
lbl('backspace').setHere()
loadA(INPUT_LENGTH_VAR_LOC)
// check for buffer underrun
constB(0); sub_into_B() // cmp(0)
JZ(lbl('waitForKeystroke')) // ignore backspace

// dec x
constB(1)
sub_into_A()
storeA(INPUT_LENGTH_VAR_LOC)

constB(lcd.getLineAddress(INPUT_LINE))
add_into_A()
lcdCtrlA()
lcd.print(" ")
lcdCtrlA()

jump(lbl('waitForKeystroke'))

// user hit enter...
lbl('enter').setHere()

lcd.clearLine(OUTPUT_LINE)
lcd.moveCursor(OUTPUT_LINE)
const PROCESSING_VAR_LOC = 0xfe
constA(0)
lbl('processInputLoop').setHere()

loadB(INPUT_LENGTH_VAR_LOC)
sub_into_B()
JZ(lbl('endProcessingInput'))

storeA(PROCESSING_VAR_LOC)
AloadA()

// PROCESSING ONE CHARACTER! (it's in A)
;(() => {

	constB('A'.charCodeAt(0))
	sub_into_B()
	JNC(lbl('doneOneChar'))

	constB('a'.charCodeAt(0))
	sub_into_B()
	JC(lbl('lowercase'))

	constB('Z'.charCodeAt(0) + 1)
	sub_into_B()
	JC(lbl('doneOneChar'))

	constB(13)
	add_into_A()
	constB('Z'.charCodeAt(0) + 1)
	sub_into_B()
	JNC(lbl('doneOneChar'))

	constB(26)
	sub_into_A()
	jump(lbl('doneOneChar'))

	lbl('lowercase').setHere()

	constB('z'.charCodeAt(0) + 1)
	sub_into_B()
	JC(lbl('doneOneChar'))

	constB(13)
	add_into_A()
	constB('z'.charCodeAt(0) + 1)
	sub_into_B()
	JNC(lbl('doneOneChar'))

	constB(26)
	sub_into_A()
	jump(lbl('doneOneChar'))


	lbl('doneOneChar').setHere()

	outputA()
})()

loadA(PROCESSING_VAR_LOC)
constB(1)
add_into_A()
jump(lbl('processInputLoop'))

lbl('endProcessingInput').setHere()

lcd.clearLine(INPUT_LINE)
jump(lbl('startOver'))

//lbl('halt').setHere()
//halt()
//jump(lbl('halt'))

compile()


if (!argv.dry) {
	console.log('Uploading...')
	uploader.upload(machineCode)
}

