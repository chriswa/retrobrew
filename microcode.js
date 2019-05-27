const util = require('./util.js')
const moveBit = util.moveBit

const FLAG_MASK = 1 + 2 + 4
const MAX_ALU_OPS = 16

class BaseSignal {
    constructor(name, romIndex) {
        this.name = name
        this.romIndex = romIndex
    }
    setInactive(controlRoms) {
    }
    setActive(controlRoms) {
    }
}
class NormalSignal extends BaseSignal {
    constructor(name, romIndex, bitIndex, isInverted) {
        super (name, romIndex)
        this.bitIndex = bitIndex
        this.isInverted = isInverted
    }
    setInactive(controlRoms) {
        if (this.isInverted) {
            controlRoms[this.romIndex] |= moveBit(1, 0, this.bitIndex) // XXX: assume we'll only get called on zero'd data
        }
    }
    setActive(controlRoms) {
        controlRoms[this.romIndex] ^= moveBit(1, 0, this.bitIndex) // XXX: assume we'll only get called once
    }
}
class MuxedSignal extends BaseSignal {
    constructor(name, romIndex, bitIndices, muxId) {
        super (name, romIndex)
        this.bitIndices = bitIndices
        this.muxId = muxId
    }
    setInactive(controlRoms) {
    }
    setActive(controlRoms) {
        let value = this.muxId
        for (let valueBit = 0; valueBit < this.bitIndices.length; valueBit += 1) {
            controlRoms[this.romIndex] ^= moveBit(value & 0b1, 0, this.bitIndices[valueBit])
            value >>= 1
        }
    }
}

function addSignal(signal) { Signals[signal.name] = signal }

/** @type {Object< string, BaseSignal >} } */
const Signals = {};
'FW LCD MS HLT NXT II DI xx'.split(' ').forEach((token, index) => {
    if (token === 'xx') { return }
    addSignal(new NormalSignal(token, 0, index, false))
})
const muxOutputOrder = [14, 13, 12, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
'KBD xx xx xx xx AR BR SR xx xx DPR IPR DOR IOR MR'.split(' ').forEach((token, index) => {
    if (token === 'xx') { return }
    addSignal(new MuxedSignal(token, 1, [0, 1, 2, 3], muxOutputOrder[index]))
    //console.log(`MuxedSignal ${token} value is ${util.leftPad(value.toString(2), 4)}`)
})
'BW AW OUT xx xx xx xx xx IPW DPW IW IOW DOW MW xx'.split(' ').forEach((token, index) => {
    if (token === 'xx') { return }
    addSignal(new MuxedSignal(token, 1, [7, 6, 5, 4], muxOutputOrder[index]))
    //console.log(`MuxedSignal ${token} value is ${util.leftPad(value.toString(2), 4)}`)
})


function getInactiveControlSignals() {
    const outputs = [0, 0, 0]
    for (let signalName in Signals) {
        const signal = Signals[signalName]
        signal.setInactive(outputs)
    }
    return outputs
}

/*
 === Bus Read (only 1) ===
 | AR:  A Read                | BR:  B Read                | MR:  Memory Read           | SR:  ALU Read              |
 | IOR: InstAddr Offset Read  | IPR: InstAddr Page Read    | DOR: DataAddr Offset Read  | DPR: DataAddr Page Read    | KBD: Keyboard Read         |

 === Bus Write (only 1) ===
 | AW:  A Write               | BW:  B Write               | MW:  Memory Write          | IW:  Instruction Write     |
 | IOW: InstAddr Offset Write | IPW: InstAddr Page Write   | DOW: DataAddr Offset Write | DPW: DataAddr Page Write   | OUT: Display Out           |

 === Other Control Signals ===
 | MS:  Memory Select (Data)  | II:  InstAddr Increment    | DI:  DataAddr Increment    |
 | NXT: Next Instruction      | FW:  ALU Flags Write       | LCD: LCD Control Mode      |
*/
const Instructions = {
    noop:         { id: 0x00, signals: flags => ['MR IW II NXT', 'MR IW II NXT', 'MR IW II NXT', 'MR IW II NXT', 'MR IW II NXT', 'MR IW II NXT', 'MR IW II NXT'] },
    aluToA:       { id: 0x20, idMax: 0x2f, signals: flags => ['SR AW FW'] }, // ALU! bottom 4 bits select ALU operation
    aluToB:       { id: 0x30, idMax: 0x3f, signals: flags => ['SR BW FW'] }, // ALU! bottom 4 bits select ALU operation
    cmp:          { id: 0x11, signals: flags => ['FW SR'] }, // ALU! bottom 4 bits select ALU operation, therefore subtract! SR is just for aesthetics
    constA:       { id: 0x01, signals: flags => ['MR AW II'] },
    constB:       { id: 0x02, signals: flags => ['MR BW II'] },
    loadA:        { id: 0x03, signals: flags => ['MR DOW II', 'MS MR AW'] },
    loadB:        { id: 0x04, signals: flags => ['MR DOW II', 'MS MR BW'] },
    storeA:       { id: 0x13, signals: flags => ['MR DOW II', 'AR MS MW'] },
    storeB:       { id: 0x14, signals: flags => ['MR DOW II', 'BR MS MW'] },
    page:         { id: 0x80, signals: flags => ['MR DPW II'] },
    loadAFar:     { id: 0x88, signals: flags => ['MR DPW II', 'MR DOW II', 'MS MR AW'] },
    loadBFar:     { id: 0x89, signals: flags => ['MR DPW II', 'MR DOW II', 'MS MR BW'] },
    storeAFar:    { id: 0x9a, signals: flags => ['MR DPW II', 'MR DOW II', 'AR MS MW'] },
    storeBFar:    { id: 0x9b, signals: flags => ['MR DPW II', 'MR DOW II', 'BR MS MW'] },
    jump:         { id: 0x40, signals: flags => ['MR IOW'] },
    jumpFar:      { id: 0xc0, signals: flags => ['MR BW II', 'MR IOW', 'BR IPW'] },
    JZ:           { id: 0x44, signals: flags => (flags & 1) ? ['MR IOW'] : ['II'] },
    JZFar:        { id: 0xc4, signals: flags => (flags & 1) ? ['MR BW II', 'MR IOW', 'BR IPW'] : ['II', 'II'] },
    JNZ:          { id: 0x46, signals: flags => !(flags & 1) ? ['MR IOW'] : ['II'] },
    JNZFar:       { id: 0xc6, signals: flags => !(flags & 1) ? ['MR BW II', 'MR IOW', 'BR IPW'] : ['II', 'II'] },
    JC:           { id: 0x48, signals: flags => (flags & 2) ? ['MR IOW'] : ['II'] },
    JCFar:        { id: 0xc8, signals: flags => (flags & 2) ? ['MR BW II', 'MR IOW', 'BR IPW'] : ['II', 'II'] },
    JNC:          { id: 0x4a, signals: flags => !(flags & 2) ? ['MR IOW'] : ['II'] },
    JNCFar:       { id: 0xca, signals: flags => !(flags & 2) ? ['MR BW II', 'MR IOW', 'BR IPW'] : ['II', 'II'] },
    JNK:          { id: 0x4f, signals: flags => !(flags & 4) ? ['FW', 'MR IOW'] : ['FW', 'II'] },
    JNKFar:       { id: 0xcf, signals: flags => !(flags & 4) ? ['FW', 'MR BW II', 'MR IOW', 'BR IPW'] : ['FW', 'II', 'II'] }, // NOOOO multistep flag-switching can switch part way through!
    JNKA:         { id: 0x4e, signals: flags => !(flags & 4) ? ['FW', 'MR IOW'] : ['FW', 'II KBD AW'] },
    JNKAFar:      { id: 0xce, signals: flags => !(flags & 4) ? ['FW', 'MR BW II', 'MR IOW', 'BR IPW'] : ['FW', 'II KBD AW', 'II'] }, // NOOOO multistep flag-switching can switch part way through!
    jumpA:        { id: 0x41, signals: flags => ['AR IOW'] },
    jumpABFar:    { id: 0xc1, signals: flags => ['AR IOW', 'BR IPW'] },
    keyboardA:    { id: 0x0f, signals: flags => ['FW KBD AW'] },
    storeKbdInc:  { id: 0x0e, signals: flags => ['FW KBD MW MS DI'] },
    output:       { id: 0x70, signals: flags => ['MR OUT II'] },
    outputA:      { id: 0x71, signals: flags => ['AR OUT'] },
    outputB:      { id: 0x72, signals: flags => ['BR OUT'] },
    lcdCtrl:      { id: 0x74, signals: flags => ['MR OUT II LCD'] },
    lcdCtrlA:     { id: 0x75, signals: flags => ['AR OUT LCD'] },
    lcdCtrlB:     { id: 0x76, signals: flags => ['BR OUT LCD'] },
    BmovA:        { id: 0x1c, signals: flags => ['BR AW'] },
    AmovB:        { id: 0x1d, signals: flags => ['AR BW'] },
    AswapB:       { id: 0x1e, signals: flags => ['AR DOW', 'BR AW', 'DOR AW'] },
    AloadA:       { id: 0x05, signals: flags => ['AR DOW', 'MS MR AW'] },
    AloadB:       { id: 0x06, signals: flags => ['AR DOW', 'MS MR BW'] },
    BloadA:       { id: 0x07, signals: flags => ['BR DOW', 'MS MR AW'] },
    BloadB:       { id: 0x08, signals: flags => ['BR DOW', 'MS MR BW'] },
    AstoreB:      { id: 0x16, signals: flags => ['AR DOW', 'BR MS MW'] },
    BstoreA:      { id: 0x17, signals: flags => ['BR DOW', 'AR MS MW'] },
    ABloadA:      { id: 0x93, signals: flags => ['AR DOW', 'BR DPW', 'MS MR AW'] },
    ABloadB:      { id: 0x94, signals: flags => ['AR DOW', 'BR DPW', 'MS MR BW'] },
    storeTwo:     { id: 0x0a, signals: flags => ['MR AW II', 'MR DOW II', 'AR MS MW', 'MR AW II', 'MR DOW II', 'AR MS MW'] },
    iloadA:       { id: 0x09, signals: flags => ['MR DOW II', 'MS MR DOW', 'MS MR AW'] },
    istoreA:      { id: 0x19, signals: flags => ['MR DOW II', 'MS MR DOW', 'AR MS MW'] },
    iloadAFar:    { id: 0x8c, signals: flags => ['MR DPW II', 'MR DOW II', 'MS MR DOW', 'MS MR AW'] },
    istoreAFar:   { id: 0x9c, signals: flags => ['MR DPW II', 'MR DOW II', 'MS MR DOW', 'AR MS MW'] },
    pause:        { id: 0xfd, signals: flags => ['AR', 'AR', 'AR', 'AR', 'AR', 'AR', 'AR'] },
    halt:         { id: 0xff, signals: flags => ['HLT'] },
}

module.exports = {
    Signals,
    getInactiveControlSignals,
    Instructions,
    FLAG_MASK,
    MAX_ALU_OPS,
}
