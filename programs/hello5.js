const util = require('../util.js')
require('../asm.js')
const leftPad = util.leftPad

function print(str) { str.split('').forEach(c => output(c)) }

lcdCtrl(0x01) // Clear
lcdCtrl(0x0f) // Display On, Cursor On, Blinking On
lcdCtrl(0b00111000)
print('    Hello Lauren!   ')
lcdCtrl(0xC0)
print('      <3    <3      ')
lcdCtrl(0xD4)
print('      <3    <3      ')


________________(l.outerLabel)

lcdCtrl(0x94)
print(' <3  I love you  <3 ')

constA(255)
________________(l.wait1)
decA_into_A()
JNZ(l.wait1)


lcdCtrl(0x94)
print('<3   I love you   <3')

constA(255)
________________(l.wait2)
decA_into_A()
JNZ(l.wait2)

jump(l.outerLabel)
