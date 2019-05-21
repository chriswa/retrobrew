const argv = require('minimist')(process.argv.slice(2))
require('../asm.js')
const uploader = require('./uploader.js')
const lcd = require('../lcd.js')

uploader.startInteractiveMode()
