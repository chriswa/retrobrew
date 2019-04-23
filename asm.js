const aluOperations = require('./alu.js')
const microcode = require('./microcode.js')
const util = require('./util.js')

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

const machineCode = global['machineCode'] = []
const sourceMap = []

function declareFunction(functionName, argCount, instructionCode) {
	//console.log(functionName)
	global[functionName] = (...args) => {
		if (args.length !== argCount) {
			throw new Error(`${functionName} accepts exactly ${argCount} argument(s)`)
		}
		sourceMap.push({ addr: machineCode.length, functionName, argCount })
		machineCode.push(instructionCode, ...args)
	}
}


class Label {
	setHere() {
		this.value = machineCode.length
	}
	resolve() {
		return this.value
	}
}

const lblMap = {}
function lbl(name) {
	if (!lblMap[name]) { lblMap[name] = new Label() }
	return lblMap[name]
}

global['lbl'] = lbl

global['Label'] = Label

global['compile'] = () => {
	for (let addr = 0; addr < machineCode.length; addr += 1) {
		if (machineCode[addr] instanceof Label) {
			machineCode[addr] = machineCode[addr].resolve()
		}
		else if (typeof(machineCode[addr]) === 'string') {
			machineCode[addr] = machineCode[addr].charCodeAt(0)
		}
	}
	console.log(`SourceMap:`)
	let sourceMapContent = ''
	sourceMap.forEach(({ addr, functionName, argCount }) => {
		const values = machineCode.slice(addr, addr + argCount + 1)
		const addrDisplay = (0x8000 + addr).toString(16)
		const valuesDisplay = values.map(n => util.leftPad(n.toString(16), 2)).join(' ')
		sourceMapContent += `${addrDisplay} : ${util.rightPad(valuesDisplay, 10, ' ')} // ${functionName}\n`
	})
	console.log(sourceMapContent)
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

