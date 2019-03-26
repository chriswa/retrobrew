#include <Arduino.h>

#define PIN_ENABLE 2
#define PIN_DIRECTION 3
#define PIN_DATA_7 4
#define PIN_DATA_0 11
#define PIN_FLAG_OUT_KBD 12
#define PIN_SIGNAL_IN_KBD A0
#define PIN_SIGNAL_IN_MON A1
#define PIN_RESET_OUT A2
#define PIN_CLOCK_IN A3

unsigned char readFromBus() {
  digitalWrite(PIN_ENABLE, LOW);
  for (int pin = PIN_DATA_0; pin >= PIN_DATA_7; pin -= 1) {
    pinMode(pin, INPUT);
  }
  digitalWrite(PIN_DIRECTION, LOW);
  digitalWrite(PIN_ENABLE, HIGH);
  unsigned char value = 0;
  for (int pin = PIN_DATA_7; pin <= PIN_DATA_0; pin += 1) {
    value <<= 1;
    value |= digitalRead(pin) ? 0x1 : 0x0;
  }
  digitalWrite(PIN_ENABLE, LOW);
  return value;
}

void startWritingToBus(unsigned char value) {
  digitalWrite(PIN_ENABLE, LOW);
  unsigned char remainingValue = value;
  for (int pin = PIN_DATA_0; pin >= PIN_DATA_7; pin -= 1) {
    digitalWrite(pin, remainingValue & 0x01 ? HIGH : LOW);
    pinMode(pin, OUTPUT);
    remainingValue >>= 1;
  }
  digitalWrite(PIN_DIRECTION, HIGH);
  digitalWrite(PIN_ENABLE, HIGH);
}

void stopWritingToBus() {
  digitalWrite(PIN_ENABLE, LOW);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

unsigned char keyboardByte;
boolean isKeyboardEmpty = true;
boolean isKeyboardOutputting = false;
boolean isMonitorInputting = false;

void setKeyboardByte(unsigned char newKeyboardByte) {
  if (!isKeyboardEmpty) { Serial.println("\nARDUINO: setKeyboardByte when keyboard is not empty"); }
  keyboardByte = newKeyboardByte;
  isKeyboardEmpty = false;
  digitalWrite(PIN_FLAG_OUT_KBD, HIGH);
}

void startKeyboardOut() {
  if (isKeyboardEmpty) { Serial.println("\nARDUINO: startKeyboardOut when keyboard is empty"); keyboardByte = 0xde; }
  startWritingToBus(keyboardByte);
  digitalWrite(PIN_FLAG_OUT_KBD, LOW);
  isKeyboardOutputting = true;
}

void stopKeyboardOut() {
  if (!isKeyboardOutputting) { Serial.println("\nARDUINO: stopKeyboardOut when not outputting"); }
  stopWritingToBus();
  isKeyboardEmpty = true;
  isKeyboardOutputting = false;
}

void resetKeyboardState() {
  stopWritingToBus();
  digitalWrite(PIN_FLAG_OUT_KBD, LOW);
  isKeyboardEmpty = true;
  isKeyboardOutputting = false;
  isMonitorInputting = false;
}

void setup() {
  digitalWrite(LED_BUILTIN, HIGH);

  Serial.begin(57600);
  Serial.println("\nBooting...");

  digitalWrite(PIN_ENABLE, LOW);
  pinMode(PIN_ENABLE, OUTPUT);
  pinMode(PIN_DIRECTION, OUTPUT);
  for (int pin = PIN_DATA_7; pin <= PIN_DATA_0; pin += 1) {
    pinMode(pin, INPUT);
  }
  pinMode(PIN_FLAG_OUT_KBD, OUTPUT);
  pinMode(PIN_SIGNAL_IN_KBD, INPUT);
  pinMode(PIN_SIGNAL_IN_MON, INPUT);

  digitalWrite(PIN_RESET_OUT, LOW);
  pinMode(PIN_RESET_OUT, OUTPUT);

  Serial.println("\nREADY");
}

boolean lastClockState = true;

void loop() {
  if (!isKeyboardOutputting && isKeyboardEmpty) {
    if (Serial.available() >= 2) {
      unsigned char controlChar = Serial.read();
      if (controlChar == 'k') {
        unsigned char receivedKeyboardByte = Serial.read();
        //Serial.print("recv keyboard byte: ");
        //Serial.print(receivedKeyboardByte, HEX);
        //Serial.println();
        setKeyboardByte(receivedKeyboardByte);
      }
      else if (controlChar == 'R') {
        Serial.read(); // consume second character
        Serial.println("MASTER RESET START");
        digitalWrite(PIN_RESET_OUT, HIGH);
        delay(1000);
        resetKeyboardState();
        lastClockState = true;
        // wait for falling clock edge
        unsigned long startTime = millis();
        while (digitalRead(PIN_CLOCK_IN) == false) {
          unsigned long currentTime = millis();
          if (currentTime - startTime > 1000) {
            Serial.println("MANUAL CLOCK MODE?");
            if (digitalRead(PIN_CLOCK_IN) == false) {
              break; // clock is probably on manual!
            }
          }
        }
        while (digitalRead(PIN_CLOCK_IN) == true) {}
        digitalWrite(PIN_RESET_OUT, LOW);
        Serial.println("MASTER RESET END");
      }
      else {
        Serial.println("Unrecognized control char!");
        Serial.println(controlChar, HEX);
      }
    }
  }

  boolean clockState = digitalRead(PIN_CLOCK_IN);
  boolean isRisingClockEdge = (clockState == true && lastClockState == false);
  lastClockState = clockState;

  boolean isKeyboardSignalEnabled = digitalRead(PIN_SIGNAL_IN_KBD);

  if (!isKeyboardOutputting && isKeyboardSignalEnabled && !isKeyboardEmpty) {
    startKeyboardOut();
  }
  if (isKeyboardOutputting && !isKeyboardSignalEnabled) {
    stopKeyboardOut();
    Serial.print("k: ");
    Serial.print(keyboardByte, HEX);
    Serial.println();
  }

  if (isRisingClockEdge) {
    boolean isMonitorSignalEnabled = digitalRead(PIN_SIGNAL_IN_MON);

    //if (!isMonitorInputting && isMonitorSignalEnabled) {
    //  isMonitorInputting = true;
    if (isMonitorSignalEnabled) {
      unsigned char busValue = readFromBus();
      Serial.print("m: ");
      Serial.print(busValue, HEX);
      Serial.println();
    }
    //if (isMonitorInputting && !isMonitorSignalEnabled) {
    //  isMonitorInputting = false; // done this read cycle
    //}
  }

}
