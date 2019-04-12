const util = require('./util.js')
const moveBit = util.moveBit
const argv = require('minimist')(process.argv.slice(2))
const microcode = require('./microcode.js')
const romWriter = require('./romWriter.js')

const chipIndex = argv.chip
if (chipIndex === undefined) {
	throw new Error(`--chip=0..2 must be specified`)
}

const controlRoms = buildMicrocode()
writeMicrocode(chipIndex, controlRoms)

if (!argv.dry) {
	romWriter.start()
}


function writeMicrocode(chipIndex, controlRoms) {
	const romIndex = parseInt(chipIndex)

	for (let address = 0; address <= 0x7fff; address += 1) {
		const controlWord = controlRoms[address]
		let byte
		if (controlWord) {
			byte = controlWord[romIndex]
		}
		else {
			byte = microcode.getInactiveControlSignals()[romIndex]
		}
		//console.log(`${leftPad(address.toString(16), 4)} := ${leftPad(byte.toString(2), 8)}`)
		romWriter.write(address, byte)
	}
}

function buildMicrocode() {
	const controlRoms = []
	buildFetches(controlRoms)
	buildInstructions(controlRoms)
	console.log('buildMicrocode complete!\n\n')
	return controlRoms
}

// every instruction's first microcode must load the next instruction into the Instruction Register,
// ...also increment the Instruction Pointer so that the next microcode instruction can read the next byte!
function buildFetches(controlRoms) {
	for (let instructionId = 0; instructionId <= 255; instructionId += 1) {
		for (let flags = 0; flags <= microcode.FLAG_MASK; flags += 1) {
			buildInstructionStep(controlRoms, 'fetch', instructionId, flags, 0, 'MR IW II')
		}
	}
}

function buildInstructions(controlRoms) {
	for (const instructionName in microcode.Instructions) {
		const instruction = microcode.Instructions[instructionName]
		const idMin = instruction.id
		let idMax = instruction.idMax
		if (idMax === undefined) { idMax = idMin }
		for (let instructionId = idMin; instructionId <= idMax; instructionId += 1) {
			for (let flags = 0; flags <= microcode.FLAG_MASK; flags += 1) {
				const controlSignalSequence = instruction.signals(flags)
				const comment = `${instructionName} @${instructionId.toString(16)} f=${util.leftPad(flags.toString(2), 3)}`
				buildInstruction(controlRoms, comment, instructionId, flags, controlSignalSequence)
			}
		}
	}
}

function buildInstruction(controlRoms, comment, instructionId, flags, controlSignalSequence) {
	for (let stepIndex = 0; stepIndex < controlSignalSequence.length; stepIndex += 1) {
		let controlSignals = controlSignalSequence[stepIndex]
		if (stepIndex === controlSignalSequence.length - 1) {
			controlSignals += ' NXT'
		}
		buildInstructionStep(controlRoms, `${comment} (step ${stepIndex})`, instructionId, flags, stepIndex + 1, controlSignals)
	}
}

function buildInstructionStep(controlRoms, comment, instructionId, flags, stepIndex, controlSignals) {
	let address = 0
	for (let instructionBit = 0; instructionBit <= 7; instructionBit += 1) {
		address |= moveBit(instructionId, instructionBit, instructionBit)
	}
	address |= moveBit(stepIndex, 0, 13)
	address |= moveBit(stepIndex, 1, 8)
	address |= moveBit(stepIndex, 2, 14)
	address |= moveBit(stepIndex, 3, 12)
	address |= moveBit(flags, 0, 10)
	address |= moveBit(flags, 1, 11)
	address |= moveBit(flags, 2, 9)

	if (controlRoms[address]) { throw new Error(`Logic error! Microcode collision at address ${address.toString(16)}`) }

	controlRoms[address] = microcode.getInactiveControlSignals()

	//console.log(`${controlRoms[address].map(n => util.leftPad(n.toString(2), 8)).join(' | ')} < starting from defaults`)

	controlSignals.split(' ').forEach(signalName => {
		if (!signalName) { return } // can be blank due to concatenating ' NXT' onto ''
		const signal = microcode.Signals[signalName]
		if (!signal) { throw new Error(`Unknown signalName '${signalName}'`) }
		signal.setActive(controlRoms[address])
		//console.log(`${controlRoms[address].map(n => util.leftPad(n.toString(2), 8)).join(' | ')} < after applying ${signalName}`)
	})
	console.log(`${util.leftPad(address.toString(16), 4)} : ${controlRoms[address].map(n => util.leftPad(n.toString(2), 8)).join(' | ')} // ${comment} // ${controlSignals.trim()}`)
}
