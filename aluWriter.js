const util = require('./util.js')
const argv = require('minimist')(process.argv.slice(2))
const aluOperations = require('./alu.js')
const romWriter = require('./romWriter.js')

const MAX_ALU_OPERATIONS = 16

const aluOperationsByOpIndex = {}
for (const name in aluOperations) {
	const op = aluOperations[name]
	if (aluOperationsByOpIndex[op.opIndex]) { throw new Error(`Logic Error! Conflicting ALU opIndex ${op.opIndex}`) }
	aluOperationsByOpIndex[op.opIndex] = { name, ...op }
}


/*
let bus, carry, zero;
[bus, carry, zero] = nibbleMath(1, 0x8, 0x8, 0, false);
console.log(`low nibble, carryIn=0 -> BUS=${bus} carry=${carry} zero?${zero}`);
[bus, carry, zero] = nibbleMath(1, 0x8, 0x8, 1, false);
console.log(`low nibble, carryIn=1 -> BUS=${bus} carry=${carry} zero?${zero}`);
[bus, carry, zero] = nibbleMath(1, 0x8, 0x8, 0, true);
console.log(`high nibble, carryIn=0 -> BUS=${bus} carry=${carry} zero?${zero}`);
[bus, carry, zero] = nibbleMath(1, 0x8, 0x8, 1, true);
console.log(`high nibble, carryIn=1 -> BUS=${bus} carry=${carry} zero?${zero}`);
process.exit();
*/


const chipIndex = argv.chip
if (chipIndex === undefined) {
	throw new Error(`--chip=0..1 must be specified`)
}

writeAlu(chipIndex === 0 ? false : true)

if (!argv.dry) {
	romWriter.start()
}




function wipeRom(addr0, addr1, value) {
	for (let addr = addr0; addr <= addr1; addr += 1) {
		romWriter.write(addr, value)
	}
}

function writeAlu(isHighNibbleChip) {
	const moveBit = util.moveBit
	//const collisionMap = []
	for (let op = 0; op < MAX_ALU_OPERATIONS; op += 1) {
		//if (op !== 1) { continue }
		for (let a = 0; a <= 0xf; a += 1) {
			//if (a !== 8) { continue }
			for (let b = 0; b <= 0xf; b += 1) {
				//if (b !== 8) { continue }
				for (let carryIn = 0; carryIn <= 1; carryIn += 1) {

					/*
					ALU pins
					- D0..3 is bus output
					- D7 is carry out
					- A10 is carry in
					- A0, A1, A2, A3: register A nibble in
					- A13, A8, A9, A11: register B nibble in
					- A4, A5, A6, A7, A12, A14: operation select in
					*/

					// PROPER BIT POSITIONS
					let address = a
					address = address | moveBit(b, 0, 13) | moveBit(b, 1, 8) | moveBit(b, 2, 9) | moveBit(b, 3, 11)
					address = address | moveBit(op, 5, 4) | moveBit(op, 4, 5) | moveBit(op, 3, 6) | moveBit(op, 2, 7) | moveBit(op, 1, 12) | moveBit(op, 0, 14)
					address = address | moveBit(carryIn, 0, 10)

					//console.log(`a=${binaryString(a, 4)}, b=${binaryString(b, 4)}, op=${binaryString(op, 3)}, carryIn=${binaryString(carryIn, 1)} -> addr=${binaryString(address, 12)}`)
					//if (collisionMap[address]) { throw new Error('collision at ' + address) }
					//collisionMap[address] = true

					const [busOut, carryOut, zeroOut] = nibbleMath(op, a, b, carryIn, isHighNibbleChip)

					const value = busOut | (zeroOut << 6) | (carryOut << 7)

					//console.log(`${util.leftPad(address.toString(16), 4)} := ${util.leftPad(value.toString(16), 2)}`)

					romWriter.write(address, value)

				}
			}
		}
	}
}

/** @returns {Array< number >} */
function nibbleMath(opIndex, a, b, carryIn, isHighNibbleChip) {
	const out = {
		result: 0,
		carry: 0,
	}
	const operation = aluOperationsByOpIndex[opIndex]
	if (operation) {
		operation.math(a, b, carryIn, isHighNibbleChip, out)
		if (out.result >= 0x10) { out.result -= 0x10; out.carry = 1 }
	}
	const zeroOut = out.result === 0
	return [out.result, out.carry, zeroOut ? 1 : 0]
}
