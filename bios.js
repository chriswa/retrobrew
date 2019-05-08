const asm = require('./asm.js')
const lcd = require('./lcd.js')

noop()
lcd.init()
JNK(l.showMenu)

________________(l.waitForInput)
JNKA(l.waitForInput)

constB('p'.charCodeAt(0)); cmp(); JZ(l.programmingMode)
constB('x'.charCodeAt(0)); cmp(); JZ(l.executeMode)
constB('r'.charCodeAt(0)); cmp(); JZ(l.rot13)
constB('m'.charCodeAt(0)); cmp(); JZ(l.showMenu)
constB('h'.charCodeAt(0)); cmp(); JZ(l.halt)
jump(l.waitForInput)

________________(l.showMenu)
lcd.print('(p)rogram')
lcd.moveCursor(1)
lcd.print('e(x)ecute')
lcd.moveCursor(2)
lcd.print('(r)ot13')
lcd.moveCursor(3)
lcd.print('> ')
jump(l.waitForInput)

________________(l.programmingMode)
lcd.clear()
lcd.print('Programming...')
page(0x80)
________________(l.ramWrite)
JNK(l.ramWrite)
storeKbdInc()
jump(l.ramWrite) // n.b. reset computer to exit programming mode

________________(l.executeMode)
lcd.clear()
jumpFar(0x80, 0x00)

________________(l.rot13)
lcd.clear()
jumpFar(0x01, 0x00)

________________(l.halt)
lcd.clear()
halt()

// extra bytes to workaround romWriter bug?!
constA(255)


compile()
