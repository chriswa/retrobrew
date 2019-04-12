#include <Arduino.h>

#define PIN_DATA 2
#define PIN_CLOCK 3
#define PIN_LATCH 4
#define PIN_DATA_0 5
#define PIN_DATA_7 12
#define PIN_WRITE 13

void dumpRange(unsigned int baseMin, unsigned int baseMax);
void writeByte(unsigned int address, byte data);

void setupRomWriter() {
  pinMode(PIN_DATA, OUTPUT);
  pinMode(PIN_CLOCK, OUTPUT);
  pinMode(PIN_LATCH, OUTPUT);
  digitalWrite(PIN_WRITE, HIGH);
  pinMode(PIN_WRITE, OUTPUT);

  //dumpRange(0, 64);
  //writeByte(32, 0xde);
  //writeByte(33, 0xad);
  //writeByte(34, 0xbe);
  //writeByte(35, 0xef);
  //dumpRange(0, 64);
}

unsigned int getMessageLength(unsigned char messageType) {
  if (messageType == 'r') { return 5; }
  else if (messageType == 'w') { return 4; }
  else { return 1; }
}

void processReceivedMessage(unsigned char * serialReadBuffer) {
  unsigned char messageType = serialReadBuffer[0];

  if (messageType == 'r') {
    //Serial.println("reading!");
    unsigned int startByte = (serialReadBuffer[1] * 256) | serialReadBuffer[2];
    unsigned int endByte = (serialReadBuffer[3] * 256) | serialReadBuffer[4];
    //Serial.println(startByte);
    //Serial.println(endByte);
    dumpRange(startByte, endByte);
  }
  else if (messageType == 'w') {
    //Serial.println("writing!");
    writeByte((serialReadBuffer[1] * 256) | serialReadBuffer[2], serialReadBuffer[3]);
  }
  else {
    Serial.println("unnknown messageType");
    Serial.println(messageType);
  }
  Serial.println("READY");
}



bool isChipInWriteMode = true;

void setAddress(unsigned int address, bool outputEnable) {
  //Serial.print(address);
  //Serial.print(" (");
  //Serial.print(outputEnable);
  //Serial.print(") -> ");
  //Serial.print(((address >> 8) & 0x7f) | (outputEnable ? 0x00 : 0x80));
  //Serial.print(", ");
  //Serial.println(address & 0xff);
  shiftOut(PIN_DATA, PIN_CLOCK, MSBFIRST, ((address >> 8) & 0x7f) | (outputEnable ? 0x00 : 0x80));
  shiftOut(PIN_DATA, PIN_CLOCK, MSBFIRST, address & 0xff);
  digitalWrite(PIN_LATCH, LOW);
  digitalWrite(PIN_LATCH, HIGH);
  digitalWrite(PIN_LATCH, LOW);
  delay(1);
}

byte readByte(unsigned int address) {

  if (isChipInWriteMode) {
    isChipInWriteMode = false;
    delay(200);
  }

  setAddress(address, true);
  byte data = 0;
  for (unsigned int pin = PIN_DATA_7; pin >= PIN_DATA_0; pin -= 1) {
    pinMode(pin, INPUT);
    data = (data << 1) | digitalRead(pin);
  }
  return data;
}

void writeByte(unsigned int address, byte data) {
  isChipInWriteMode = true;
  //Serial.println(address);
  //Serial.println(data);

  setAddress(address, false);
  for (unsigned int pin = PIN_DATA_0; pin <= PIN_DATA_7; pin += 1) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, data & 0x1);
    data = data >> 1;
  }
  digitalWrite(PIN_WRITE, LOW);
  //delayMicroseconds(1);
  delay(1);
  digitalWrite(PIN_WRITE, HIGH);
  delay(10);
}

void dumpRange(unsigned int baseMin, unsigned int baseMax) {
  //Serial.println("Dumping ROM contents:");
  //Serial.println(baseMin);
  //Serial.println(baseMax);
  for (unsigned int base = baseMin; base <= baseMax; base += 16) {
    byte data[16];
    for (unsigned int offset = 0; offset < 16; offset += 1) {
      data[offset] = readByte(base + offset);
    }
    char buf[80];
    sprintf(buf, "%04x:  %02x %02x %02x %02x %02x %02x %02x %02x  %02x %02x %02x %02x %02x %02x %02x %02x", base, data[0], data[1], data[2], data[3], data[4], data[5], data[6], data[7], data[8], data[9], data[10], data[11], data[12], data[13], data[14], data[15]);
    Serial.println(buf);
  }
}






// ====================================================================================================================
//  Receiving messages
// ====================================================================================================================

const byte DATA_MAX_SIZE = 255;
unsigned char serialReadBuffer[DATA_MAX_SIZE];
unsigned int serialReadCursor = 0;
bool errorState = false;

void initReceiveData() {
  serialReadCursor = 0;
  memset(serialReadBuffer, 0, sizeof(serialReadBuffer));
}

void receiveData() {
  unsigned char receivedChar;
  while (Serial.available() > 0) {
    receivedChar = Serial.read();
    serialReadBuffer[serialReadCursor] = receivedChar;
    if (getMessageLength(serialReadBuffer[0]) == serialReadCursor + 1) {
      processReceivedMessage(serialReadBuffer);
      initReceiveData();
      return;
    }
    serialReadCursor++;
    if (serialReadCursor >= DATA_MAX_SIZE) {
      Serial.println("error: buffer overflow");
      errorState = true;
      break;
    }
  }
}

void setup() {
  Serial.begin(57600);
  //pinMode(LED_BUILTIN, OUTPUT);

  setupRomWriter();

  Serial.println("Hello from Arduino!");
  Serial.println("READY");
}

void loop() {
  if (errorState) {
    digitalWrite(LED_BUILTIN, HIGH); delay(100); digitalWrite(LED_BUILTIN, LOW); delay(150);
    digitalWrite(LED_BUILTIN, HIGH); delay(100); digitalWrite(LED_BUILTIN, LOW); delay(150);
    digitalWrite(LED_BUILTIN, HIGH); delay(100); digitalWrite(LED_BUILTIN, LOW); delay(150);
    digitalWrite(LED_BUILTIN, HIGH); delay(400); digitalWrite(LED_BUILTIN, LOW); delay(150);
    digitalWrite(LED_BUILTIN, HIGH); delay(400); digitalWrite(LED_BUILTIN, LOW); delay(150);
    digitalWrite(LED_BUILTIN, HIGH); delay(400); digitalWrite(LED_BUILTIN, LOW); delay(150);
    digitalWrite(LED_BUILTIN, HIGH); delay(100); digitalWrite(LED_BUILTIN, LOW); delay(150);
    digitalWrite(LED_BUILTIN, HIGH); delay(100); digitalWrite(LED_BUILTIN, LOW); delay(150);
    digitalWrite(LED_BUILTIN, HIGH); delay(100); digitalWrite(LED_BUILTIN, LOW); delay(150);
    delay(500);
  }
  else {
    receiveData();
    delay(10);
  }
}


