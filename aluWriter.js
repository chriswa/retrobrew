const util = require('./util.js')
const argv = require('minimist')(process.argv.slice(2))
const aluOperations = require('./alu.js')
const romWriter = require('./romWriter.js')

const aluOperationsByOpIndex = {}
for (const name in aluOperations) {
	const op = aluOperations[name]
	if (aluOperationsByOpIndex[op.opIndex]) { throw new Error(`Logic Error! Conflicting ALU opIndex ${op.opIndex}`) }
	aluOperationsByOpIndex[op.opIndex] = { name, ...op }
}

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
	for (let op = 0; op <= 5; op += 1) {
		for (let a = 0; a <= 0xf; a += 1) {
			for (let b = 0; b <= 0xf; b += 1) {
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
					address = address | moveBit(b, 0, 13) | moveBit(b, 1, 8) | moveBit(b, 2, 9) | moveBit(b, 3, 12)
					address = address | moveBit(op, 0, 4) | moveBit(op, 1, 5) | moveBit(op, 2, 6) | moveBit(op, 3, 7) | moveBit(op, 4, 12) | moveBit(op, 5, 14)
					address = address | moveBit(carryIn, 0, 10)

					//console.log(`a=${binaryString(a, 4)}, b=${binaryString(b, 4)}, op=${binaryString(op, 3)}, carryIn=${binaryString(carryIn, 1)} -> addr=${binaryString(address, 12)}`)
					//if (collisionMap[address]) { throw new Error('collision at ' + address) }
					//collisionMap[address] = true

					const [busOut, carryOut, zeroOut] = nibbleMath(op, a, b, carryIn, isHighNibbleChip)

					const value = busOut | (zeroOut << 6) | (carryOut << 7)

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
	if (!operation) { throw new Error(`Logic Error! Unimplemented ALU opIndex ${opIndex}`) }
	operation.math(a, b, carryIn, isHighNibbleChip, out)
	if (out.result >= 0x10) { out.result -= 0x10; out.carry = 1 }
	const zeroOut = out.result === 0
	return [out.result, out.carry, zeroOut ? 1 : 0]
}
