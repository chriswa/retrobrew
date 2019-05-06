module.exports = new class LCD {
	init() {
		this.clear()
		lcdCtrl(0b00111000) // 8 bit communication, "two" (4) display lines
		lcdCtrl(0x0f) // Display On, Cursor On, Blinking On
		lcdCtrl(0b00000110) // Entry Mode: cursor increments, no auto-shifting
	}
	clear() { lcdCtrl(0x01) }
	print(str) { str.split('').forEach(c => output(c)) }
	getLineAddress(y) {
		if (y === 0) { return 0x80 }
		else if (y === 1) { return 0xC0 }
		else if (y === 2) { return 0x94 }
		else if (y === 3) { return 0xD4 }
		else { throw new Error(`lcd.getLineAddress expects an integer in 0..3`) }
	}
	moveCursor(y = 0, x = 0) {
		lcdCtrl(this.getLineAddress(y) + x)
	}
	clearLine(y) {
		this.moveCursor(y)
		this.print(' '.repeat(20))
	}
	shiftLeft() {
		lcdCtrl(0b00011000) // shift left 1
	}
	shiftRight() {
		lcdCtrl(0b00011100) // shift right 1
	}
}
