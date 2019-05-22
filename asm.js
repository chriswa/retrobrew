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

module.exports.reset = () => {
	machineCode.length = 0
	sourceMap.length = 0
	Object.keys(labelDict).forEach((key) => { delete labelDict[key] })
}

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


// Labels

let programOffset = 0

const labelDict = {}
global['Label'] = class Label {
	constructor(name) { this.name = name }
	setHere() { this.location = machineCode.length }
	getLocation() {
		if (this.location === undefined) { throw new Error(`Label ${this.name} cannot be resolved because it was never setHere() to location in machinecode`) }
		return programOffset + this.location
	}
	resolveShort(jumpSourceAddr) {
		if (jumpSourceAddr >> 8 !== this.getLocation() >> 8) { throw new Error(`Label.resolveShort attempting to jump from outside of page!`) }
		return this.getLocation() & 0xff
	}
	resolveLong() {
		return this.getLocation()
	}
	getLow() {
		return this.getLocation() & 0xff
	}
	getHigh() {
		return this.getLocation() >> 8
	}
}
global['l'] = new Proxy(labelDict, {
	get(target, key) {
		if (key === '[object Object]') { throw new Error('wat') }
		if (!target[key]) {
			//console.log(`new Label ${key}`)
			target[key] = new Label(key)
		}
		else {
			//console.log(`old Label ${key}`)
		}
		return target[key]
	}
})
global['________________'] = (label) => {
	label.setHere()
}

// Compile

const functionArgumentResolvers = {}
'jump JZ JNZ JC JNC JNK JNKA'.split(' ').forEach(functionName => {
	functionArgumentResolvers[functionName] = (labelArg, jumpSourceAddr) => {
		return [ labelArg.resolveShort(jumpSourceAddr) ]
	}
})
'jumpFar JZFar JNZFar JCFar JNCFar JNKFar JNKAFar'.split(' ').forEach(functionName => {
	functionArgumentResolvers[functionName] = (labelArg, jumpSourceAddr) => {
		const location = labelArg.resolveLong(jumpSourceAddr)
		return [ location >> 8, location & 0xff ]
	}
})

 

global['compile'] = (programOffset_) => {
	programOffset = programOffset_
	for (let addr = 0; addr < machineCode.length; addr += 1) {
		//if (machineCode[addr] instanceof Label) {
		//	machineCode[addr] = machineCode[addr].resolveShort(addr)
		//}
		if (typeof(machineCode[addr]) === 'string') {
			machineCode[addr] = machineCode[addr].charCodeAt(0)
		}
	}
	// resolve labels
	sourceMap.forEach(({ addr, functionName, argCount }) => {
		if (argCount >= 1) {
			const firstArg = machineCode[addr + 1]
			if (firstArg instanceof Label) {
				const resolvedValues = functionArgumentResolvers[functionName](firstArg, addr + argCount)
				machineCode.splice(addr + 1, argCount, ...resolvedValues)
			}
		}
		for (let i = 1; i <= argCount; i += 1) {
			if (typeof machineCode[addr + i] === 'function') {
				const resolvedValue = machineCode[addr + i](addr)
				machineCode.splice(addr + i, 1, resolvedValue)
			}
		}
	})
	// display source map
	console.log(`SourceMap:`)
	let sourceMapContent = ''
	sourceMap.forEach(({ addr, functionName, argCount }) => {
		const values = machineCode.slice(addr, addr + argCount + 1)
		//console.log(JSON.stringify(values))
		const addrDisplay = (addr).toString(16)
		const valuesDisplay = values.map(n => util.leftPad(n.toString(16), 2)).join(' ')
		sourceMapContent += `${addrDisplay} : ${util.rightPad(valuesDisplay, 10, ' ')} // ${functionName}\n`
	})
	console.log(sourceMapContent)
	if (machineCode.length > 0x100) {
		console.log(`*** WARNING *** machineCode extends beyond 0xFF - naive short jumps will likely fail`)
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

