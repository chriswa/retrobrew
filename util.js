module.exports.moveBit = (n, oldBit, newBit) => {
	const value = (n >> oldBit) & 0x1
	return value << newBit
}

module.exports.leftPad = (n, width, z = '0') => {
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
}

module.exports.binaryString = (n, width) => {
	const z = '0'
	n = n.toString(2) + ''
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
}
