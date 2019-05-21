const argv = require('minimist')(process.argv.slice(2))
const uploader = require('./uploader.js')
const asm = require('../asm.js')
const lcd = require('../lcd.js')

const VAR_HEX_ASCII_LOOKUP = 0x00 // .. 0x0F
const VAR_ADDR_LOW = 0x80
const VAR_ADDR_HIGH = 0x81
const VAR_RETURN_LOW = 0x82
const VAR_RETURN_HIGH = 0x83
const VAR_HEXOUTPUTB_TEMP = 0x84
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
//initStack()
constA(0x80)
storeA(VAR_ADDR_HIGH)
constA(0x00)
storeA(VAR_ADDR_LOW)
'0123456789ABCDEF'.split('').forEach((c, i) => { constA(c); storeA(VAR_HEX_ASCII_LOOKUP + i) })

jumpFar(l.checkForInput, 0)

________________(l.hexOutputB)
{
	shrB_into_A();shrA_into_A();shrA_into_A();shrA_into_A()
	AloadA()
	outputA()

	constA(0x0F)
	and_into_A()
	AloadA()
	outputA()

	loadA(VAR_RETURN_LOW)
	loadB(VAR_RETURN_HIGH)

	jumpABFar()
}



________________(l.checkForInput)


________________(l.displayUI)


// display address in hex
{
	lcd.moveCursor(0)

	//constA(() => l.return1.getLow()); storeA(VAR_RETURN_LOW); constA(() => l.return1.getHigh()); storeA(VAR_RETURN_HIGH) // prepare to call function!
	storeTwo(() => l.return1.getLow(), VAR_RETURN_LOW, () => l.return1.getHigh(), VAR_RETURN_HIGH)
	loadB(VAR_ADDR_LOW)
	jumpFar(l.hexOutputB, 0)
	________________(l.return1)

	//constA(() => l.return2.getLow()); storeA(VAR_RETURN_LOW); constA(() => l.return2.getHigh()); storeA(VAR_RETURN_HIGH) // prepare to call function!
	storeTwo(() => l.return2.getLow(), VAR_RETURN_LOW, () => l.return2.getHigh(), VAR_RETURN_HIGH)
	loadB(VAR_ADDR_HIGH)
	jumpFar(l.hexOutputB, 0)
	________________(l.return2)
}

// display some memory values nearby
{
	lcd.moveCursor(1)

	//constA(() => l.return3.getLow()); storeA(VAR_RETURN_LOW); constA(() => l.return3.getHigh()); storeA(VAR_RETURN_HIGH) // prepare to call function!
	storeTwo(() => l.return3.getLow(), VAR_RETURN_LOW, () => l.return3.getHigh(), VAR_RETURN_HIGH)
	loadA(VAR_ADDR_LOW)
	loadB(VAR_ADDR_HIGH)
	halt()
	ABloadB()
	jumpFar(l.hexOutputB, 0)
	________________(l.return3)


}

halt()


jumpFar(l.displayUI, 0)

lcd.print("@")
loadA(0)
// TODO: output A in hex
loadA(1)
// TODO: output A in hex

lcd.moveCursor(2)




compile(0x8000)

if (!argv.dry) {
	console.log('Uploading...')
	uploader.upload(machineCode)
}