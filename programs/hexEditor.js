const asm = require('../asm.js')
const lcd = require('../lcd.js')

const VAR_HEX_ASCII_LOOKUP = 0x00 // .. 0x0F
const VAR_ADDR_LOW = 0x80
const VAR_ADDR_HIGH = 0x81
const VAR_RETURN_LOW = 0x82
const VAR_RETURN_HIGH = 0x83
const VAR_CURSOR_OFFSET = 0x84
const VAR_CURSOR_ROW = 0x85

function subroutineCall(innerCode) {
	const tempLabel = new Label()
	storeTwo(() => tempLabel.getLow(), VAR_RETURN_LOW, () => tempLabel.getHigh(), VAR_RETURN_HIGH)
	innerCode()
	tempLabel.setHere()
}

//const VAR_STACK_PTR = 0x90
//function initStack() {
//	constA(VAR_STACK_PTR + 1)
//	storeA(VAR_STACK_PTR)
//}
//function stackCall(label) {
//	loadA(VAR_STACK_PTR)
//	
//}


lcd.clear()

page(0xff)
//constA(0x80)
constA(0x00)
storeA(VAR_ADDR_HIGH)
constA(0xF8)
storeA(VAR_ADDR_LOW)
'0123456789ABCDEF'.split('').forEach((c, i) => { constA(c); storeA(VAR_HEX_ASCII_LOOKUP + i) })

jumpFar(l.checkForInput, 0)

________________(l.hexOutputA)
{
	shrA_into_B();shrB_into_B();shrB_into_B();shrB_into_B()
	BloadB()
	outputB()

	constB(0x0F)
	and_into_B()
	BloadB()
	outputB()

	loadA(VAR_RETURN_LOW)
	loadB(VAR_RETURN_HIGH)

	jumpABFar()
}



________________(l.checkForInput)


________________(l.displayUI)



// display address in hex
lcd.moveCursor(0)

lcd.print('Memory at ')

subroutineCall(() => {
	loadA(VAR_ADDR_HIGH)
	jumpFar(l.hexOutputA, 0)
})

subroutineCall(() => {
	loadA(VAR_ADDR_LOW)
	jumpFar(l.hexOutputA, 0)
})

lcd.print(':')

// display some memory values nearby
lcd.moveCursor(1)


constA(0)
storeA(VAR_CURSOR_ROW)
storeA(VAR_CURSOR_OFFSET)

________________(l.nextDisplayRow)
________________(l.nextDisplayByte)
subroutineCall(() => {
	loadA(VAR_ADDR_LOW)
	loadB(VAR_CURSOR_OFFSET)
	add_into_A()
	loadB(VAR_ADDR_HIGH)
	ABloadA()
	page(0xff)
	jumpFar(l.hexOutputA, 0)
})
loadA(VAR_CURSOR_OFFSET)
constB(1)
add_into_A()
storeA(VAR_CURSOR_OFFSET)

constB(1)
and_into_B()
JNZFar(l.skipSpace, 0)
lcd.print(' ')
________________(l.skipSpace)

constB(0b111)
and_into_B()
JNZFar(l.nextDisplayByte, 0)

//halt()

loadA(VAR_CURSOR_ROW)
constB(1)
add_into_A()
storeA(VAR_CURSOR_ROW)

//halt()

sub_into_A()
JZFar(l.displayRowTwo, 0)
sub_into_A()
JZFar(l.displayRowThree, 0)

jumpFar(l.editorUI, 0)

________________(l.displayRowTwo)
lcd.moveCursor(2)
jumpFar(l.nextDisplayRow, 0)

________________(l.displayRowThree)
lcd.moveCursor(3)
jumpFar(l.nextDisplayRow, 0)






/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

________________(l.editorUI)

constA(0)
storeA(VAR_CURSOR_OFFSET)
storeA(VAR_CURSOR_ROW)




lcd.moveCursor(1)






loadA(VAR_ADDR_LOW)
constB(8)
//constB(8 * 3)
add_into_A()
storeA(VAR_ADDR_LOW)

JNCFar(l.doneIncrementingAddr, 0)
loadA(VAR_ADDR_HIGH)
constB(1)
add_into_A()
storeA(VAR_ADDR_HIGH)
________________(l.doneIncrementingAddr)



//constA(255)
//________________(l.delay)
//pause()
//constB(1)
//sub_into_A()
//JNZFar(l.delay, 0)

________________(l.waitForKeyboard)
JNKFar(l.waitForKeyboard, 0)
keyboardA()


jumpFar(l.displayUI, 0)

