module.exports.moveBit = (n, oldBit, newBit, flipBit = false) => {
	let value = (n >> oldBit) & 0x1
	if (flipBit) {
		value = ~value & 0x1
	}
	return value << newBit
}

module.exports.leftPad = (n, width, z = '0') => {
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
}

module.exports.rightPad = (n, width, z = '0') => {
	return n.length >= width ? n : n + new Array(width - n.length + 1).join(z)
}

module.exports.binaryString = (n, width) => {
	const z = '0'
	n = n.toString(2) + ''
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
}
