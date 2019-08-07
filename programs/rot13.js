const asm = require('../asm.js')
const lcd = require('../lcd.js')

const INPUT_LINE = 1
const OUTPUT_LINE = 3

lcd.init()

lcd.print("rot13")
lcd.moveCursor(2)
lcd.print("Out:")

________________(l.startOver)
lcd.moveCursor(INPUT_LINE)

page(0xff)
const INPUT_LENGTH_VAR_LOC = 0xff
constA(0)
storeA(INPUT_LENGTH_VAR_LOC)

________________(l.waitForKeystroke)
loadA(INPUT_LENGTH_VAR_LOC) // TODO: debug output
JNK(l.waitForKeystroke)

keyboardA()

constB(8); sub_into_B() // cmp(8)
JZ(l.backspace)

constB(0x0d); sub_into_B() // cmp(0x0d)
JZ(l.enter)

// not a control key...
// store key in buffer (this may overrun by one byte!)
loadB(INPUT_LENGTH_VAR_LOC)
BstoreA()
// check for buffer overflow
loadA(INPUT_LENGTH_VAR_LOC)
constB(19); sub_into_B() // cmp(19)
JZ(l.waitForKeystroke) // ignore keystroke
// accepted keystroke? load and display it!
AloadB()
outputB()
// inc x
loadA(INPUT_LENGTH_VAR_LOC) // TODO: testing
constB(1)
add_into_A()
storeA(INPUT_LENGTH_VAR_LOC)
// wait for next keystroke
jump(l.waitForKeystroke)

// user hit backspace...
________________(l.backspace)
loadA(INPUT_LENGTH_VAR_LOC)
// check for buffer underrun
constB(0); sub_into_B() // cmp(0)
JZ(l.waitForKeystroke) // ignore backspace

// dec x
constB(1)
sub_into_A()
storeA(INPUT_LENGTH_VAR_LOC)

constB(lcd.getLineAddress(INPUT_LINE))
add_into_A()
lcdCtrlA()
lcd.print(" ")
lcdCtrlA()

jump(l.waitForKeystroke)

// user hit enter...
________________(l.enter)

lcd.clearLine(OUTPUT_LINE)
lcd.moveCursor(OUTPUT_LINE)
const PROCESSING_VAR_LOC = 0xfe
constA(0)
________________(l.processInputLoop)

loadB(INPUT_LENGTH_VAR_LOC)
sub_into_B()
JZ(l.endProcessingInput)

storeA(PROCESSING_VAR_LOC)
AloadA()

// PROCESSING ONE CHARACTER! (it's in A)
;(() => {

constB('A'.charCodeAt(0))
sub_into_B()
JNC(l.doneOneChar)

constB('a'.charCodeAt(0))
sub_into_B()
JC(l.lowercase)

constB('Z'.charCodeAt(0) + 1)
sub_into_B()
JC(l.doneOneChar)

constB(13)
add_into_A()
constB('Z'.charCodeAt(0) + 1)
sub_into_B()
JNC(l.doneOneChar)

constB(26)
sub_into_A()
jump(l.doneOneChar)

________________(l.lowercase)

constB('z'.charCodeAt(0) + 1)
sub_into_B()
JC(l.doneOneChar)

constB(13)
add_into_A()
constB('z'.charCodeAt(0) + 1)
sub_into_B()
JNC(l.doneOneChar)

constB(26)
sub_into_A()
jump(l.doneOneChar)


________________(l.doneOneChar)

outputA()
})()

loadA(PROCESSING_VAR_LOC)
constB(1)
add_into_A()
jump(l.processInputLoop)

________________(l.endProcessingInput)

lcd.clearLine(INPUT_LINE)
jump(l.startOver)

//________________(l.halt)
//halt()
//jump(l.halt)
