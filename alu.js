module.exports = {
	add: { opIndex: 0x00, math(a, b, carryIn, isHighNibbleChip, out) {
		out.result = a + b + (isHighNibbleChip ? carryIn : 0)
	}},
	sub: { opIndex: 0x01, math(a, b, carryIn, isHighNibbleChip, out) {
		const bTwosComplement = (b ^ 0xf) + (isHighNibbleChip ? carryIn : 1)
		out.result = a + bTwosComplement
	}},
	shlA: { opIndex: 0x02, math(a, b, carryIn, isHighNibbleChip, out) {
		out.result = (a << 1) | (isHighNibbleChip ? carryIn : 0)
	}},
	shlB: { opIndex: 0x03, math(a, b, carryIn, isHighNibbleChip, out) {
		out.result = (b << 1) | (isHighNibbleChip ? carryIn : 0)
	}},
	shrA: { opIndex: 0x04, math(a, b, carryIn, isHighNibbleChip, out) {
		if (a & 0x1) { out.carry = 1 }
		out.result = (a >> 1) | (isHighNibbleChip ? 0 : carryIn << 3)
	}},
	shrB: { opIndex: 0x05, math(a, b, carryIn, isHighNibbleChip, out) {
		if (b & 0x1) { out.carry = 1 }
		out.result = (b >> 1) | (isHighNibbleChip ? 0 : carryIn << 3)
	}},
	and: { opIndex: 0x06, math(a, b, carryIn, isHighNibbleChip, out) {
		out.result = a & b
	}},
	or: { opIndex: 0x07, math(a, b, carryIn, isHighNibbleChip, out) {
		out.result = a | b
	}},
	xor: { opIndex: 0x08, math(a, b, carryIn, isHighNibbleChip, out) {
		out.result = a ^ b
	}},
	notA: { opIndex: 0x09, math(a, b, carryIn, isHighNibbleChip, out) {
		out.result = a ^ 0xff
	}},
	notB: { opIndex: 0x0a, math(a, b, carryIn, isHighNibbleChip, out) {
		out.result = b ^ 0xff
	}},
	one: { opIndex: 0x0b, math(a, b, carryIn, isHighNibbleChip, out) {
		out.result = isHighNibbleChip ? 0 : 1
	}},
	zero: { opIndex: 0x0c, math(a, b, carryIn, isHighNibbleChip, out) {
		out.result = 0
	}},
}
