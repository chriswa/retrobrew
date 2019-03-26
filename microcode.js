const util = require('./util.js')
const moveBit = util.moveBit

const FLAG_MASK = 1 + 2 + 4
const MAX_ALU_OPS = 16

const Signals = {};
[
    'IOR# DOR# IPR# DPR# IOW# DOW# IPW# DPW#',
    'BW AW IW FW BR# SR# AR# NXT#',
    //'XXXA XXXB XXXC II DI MR MW MS',
    'MS MW MR DI II KBD OUT XXX',
].forEach((str, romIndex) => {
    str.split(' ').forEach((token, bitIndex) => {
        const [_fullMatch, name, invertedSymbol] = token.match(/^(\w+)(#?)/)
        Signals[name] = {
            name,
            romIndex,
            bitIndex: 7 - bitIndex,
            isInverted: !!invertedSymbol,
        }
    })
})

function getInactiveControlSignals() {
    const outputs = [0, 0, 0]
    for (let signalName in Signals) {
        const signal = Signals[signalName]
        if (signal.isInverted) {
            outputs[signal.romIndex] |= moveBit(1, 0, signal.bitIndex)
        }
    }
    return outputs
}

/*
 | AR: A Read                 | BR: B Read                 | SR: ALU Read               | MR: Memory Read            | MS: Memory Select (Data)   |
 | AW: A Write                | BW: B Write                | FW: ALU Flags Write        | MW: Memory Write           | IW: Instruction Write      |
 | II: InstAddr Increment     | IOR: InstAddr Offset Read  | IOW: InstAddr Offset Write | IPR: InstAddr Page Read    | IPW: InstAddr Page Write   |
 | DI: DataAddr Increment     | DOR: DataAddr Offset Read  | DOW: DataAddr Offset Write | DPR: DataAddr Page Read    | DPW: DataAddr Page Write   |
 | KBD: Keyboard Read         | OUT: Display Out           | NXT: Next Instruction      |
 */
const Instructions = {
    aluToA:       { id: 0x20, idMax: 0x2f, signals: flags => ['SR AW FW'] }, // ALU! bottom 4 bits select ALU operation
    aluToB:       { id: 0x30, idMax: 0x3f, signals: flags => ['SR BW FW'] }, // ALU! bottom 4 bits select ALU operation
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
    JZ:           { id: 0x44, signals: flags => (flags & 1) ? ['MR IOW'] : ['II'] },
    JNZ:          { id: 0x46, signals: flags => !(flags & 1) ? ['MR IOW'] : ['II'] },
    JC:           { id: 0x48, signals: flags => (flags & 2) ? ['MR IOW'] : ['II'] },
    JNC:          { id: 0x4a, signals: flags => !(flags & 2) ? ['MR IOW'] : ['II'] },
    JNK:          { id: 0x4f, signals: flags => !(flags & 4) ? ['MR IOW'] : ['II'] },
    jumpFar:      { id: 0xc0, signals: flags => ['MR BW II', 'MR IOW', 'BR IPR'] },
    jumpA:        { id: 0x41, signals: flags => ['AR IOW'] },
    jumpABFar:    { id: 0xc1, signals: flags => ['AR IOW', 'BR IPW'] },
    keyboardA:    { id: 0x0f, signals: flags => ['KBD AW'] },
    storeKbdIncA: { id: 0x0e, signals: flags => ['KBD MW MS DI AW'] },
    output:       { id: 0x70, signals: flags => ['MR OUT II'] },
    outputA:      { id: 0x71, signals: flags => ['AR OUT'] },
    outputB:      { id: 0x72, signals: flags => ['BR OUT'] },
    BmovA:        { id: 0x1c, signals: flags => ['BR AW'] },
    AmovB:        { id: 0x1d, signals: flags => ['AR BW'] },
    AswapB:       { id: 0x1e, signals: flags => ['AR DOW', 'BR AW', 'DOR AW'] },
    AloadA:       { id: 0x05, signals: flags => ['AR DOW', 'MS MR AW'] },
    AloadB:       { id: 0x06, signals: flags => ['AR DOW', 'MS MR BW'] },
    BloadA:       { id: 0x07, signals: flags => ['BR DOW', 'MS MR AW'] },
    BloadB:       { id: 0x08, signals: flags => ['BR DOW', 'MS MR BW'] },
    AstoreB:      { id: 0x16, signals: flags => ['AR DOW', 'BR MS MW'] },
    BstoreA:      { id: 0x17, signals: flags => ['BR DOW', 'AR MS MW'] },
    iloadA:       { id: 0x09, signals: flags => ['MR DOW II', 'MS MR DOW', 'MS MR AW'] },
    istoreA:      { id: 0x19, signals: flags => ['MR DOW II', 'MS MR DOW', 'AR MS MW'] },
    iloadAFar:    { id: 0x8c, signals: flags => ['MR DPW II', 'MR DOW II', 'MS MR DOW', 'MS MR AW'] },
    istoreAFar:   { id: 0x9c, signals: flags => ['MR DPW II', 'MR DOW II', 'MS MR DOW', 'AR MS MW'] },
    pause:        { id: 0x00, signals: flags => ['AR', 'AR', 'AR', 'AR', 'AR', 'AR', 'AR', 'AR', 'AR', 'AR', 'AR', 'AR', 'AR', 'AR', 'AR'] },
    debug:        { id: 0xff, signals: flags => ['IPR', 'IOR', 'DPR', 'DOR', 'AR', 'BR', ((flags & 1) ? '' : 'IPR'), ((flags & 2) ? '' : 'IPR'), ((flags & 4) ? '' : 'IPR')] },
}

module.exports = {
    Signals,
    getInactiveControlSignals,
    Instructions,
    FLAG_MASK,
    MAX_ALU_OPS,
}
