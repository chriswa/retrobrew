const aluOperations = require('./alu.js')
const microcode = require('./microcode.js')

console.log(`declare var l: any;`)
console.log(`declare var machineCode: any;`)
console.log(`declare function ________________(any): void;`)
console.log(`declare function compile(): void;`)

for (let instructionName in microcode.Instructions) {
	const instruction = microcode.Instructions[instructionName]
	const argCount = determineArgumentCountFromInstructionSignals(instruction.signals)
	if (!instruction.idMax) {
		const functionName = instructionName
		declareFunction(functionName, argCount, instruction.id)
	}
	else {
		for (const aluOpName in aluOperations) {
			const op = aluOperations[aluOpName]
			const functionName = `${aluOpName}_${instructionName.replace(/aluTo/, 'into_')}`
			declareFunction(functionName, argCount, instruction.id + op.opIndex)
		}
	}
}

function determineArgumentCountFromInstructionSignals(signals) {
	let maxInstructionReads = 0
	for (let flags = 0; flags <= microcode.FLAG_MASK; flags += 1) {
		const controlSignalSequence = signals(flags)
		let instructionReads = 0
		controlSignalSequence.forEach(controlSignals => {
			const memoryRead = controlSignals.split(' ').filter(controlSignal => controlSignal === 'MR').length
			const memorySelect = controlSignals.split(' ').filter(controlSignal => controlSignal === 'MS').length
			instructionReads += (memoryRead && !memorySelect) ? 1 : 0
		})
		maxInstructionReads = Math.max(maxInstructionReads, instructionReads)
	}
	return maxInstructionReads
}

function declareFunction(functionName, argCount, instructionCode) {
	console.log(`declare function ${functionName}(${Array(argCount).fill('any').join(', ')}): void;`)
}

