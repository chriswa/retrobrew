#include <Arduino.h>

#define RESET_TIME_MS 100

#define PIN_DATA_0 2
#define PIN_DATA_7 9
#define PIN_ROM_SUPPRESS 10
#define PIN_SIGNAL_OUTPUT 11
#define PIN_FORCE_RESET A0
#define PIN_FLAG_KBD_READY A1
#define PIN_INV_CLOCK 12

void setup() {

	Serial.begin(57600);
	Serial.println("\nBooting...");

	for (int pin = PIN_DATA_0; pin <= PIN_DATA_7; pin += 1) {
		pinMode(pin, INPUT); // tri state
	}
	pinMode(PIN_ROM_SUPPRESS, INPUT); // tri state
	digitalWrite(PIN_ROM_SUPPRESS, HIGH);
	pinMode(PIN_SIGNAL_OUTPUT, INPUT); // tri state
	digitalWrite(PIN_SIGNAL_OUTPUT, HIGH);
	pinMode(PIN_FORCE_RESET, INPUT); // tri state
	digitalWrite(PIN_FORCE_RESET, HIGH);

	pinMode(PIN_FLAG_KBD_READY, INPUT); // input
	pinMode(PIN_INV_CLOCK, INPUT); // input

	Serial.println("\nREADY");
}

void waitOneClockCycle() {
	bool currentClockState = digitalRead(PIN_INV_CLOCK);
	while (digitalRead(PIN_INV_CLOCK) == currentClockState) { ; }
	while (digitalRead(PIN_INV_CLOCK) != currentClockState) { ; }
}

unsigned char bufferedByte;
bool isBuffered = false;


void loop() {
	if (Serial.available() >= 2) {
		unsigned char controlChar = Serial.read();
		if (controlChar == 'k') {
			if (isBuffered) {
				Serial.println("WARNING: Previous buffered keyboard byte not yet emitted before next byte arrived! Overwriting previous buffered byte!");
			}
			unsigned char dataChar = Serial.read();
			isBuffered = true;
			bufferedByte = dataChar;
		}
		else if (controlChar == 'R') {
			Serial.println("MASTER RESET START");
			digitalWrite(PIN_FORCE_RESET, HIGH);
			pinMode(PIN_FORCE_RESET, OUTPUT);
			delay(100);
			digitalWrite(PIN_FORCE_RESET, LOW);
			pinMode(PIN_FORCE_RESET, INPUT); // tri state
			delay(100);

			waitOneClockCycle();

			Serial.println("MASTER RESET END");
		}
		else {
			Serial.print("ignoring unknown control byte: ");
			Serial.print(controlChar, HEX);
			Serial.println();
		}
	}

	if (isBuffered && !digitalRead(PIN_FLAG_KBD_READY)) {
		isBuffered = false;

		waitOneClockCycle();
		waitOneClockCycle();

		digitalWrite(PIN_DATA_0 + 0, ((bufferedByte >> 0) & 1) ? HIGH : LOW);
		digitalWrite(PIN_DATA_0 + 1, ((bufferedByte >> 1) & 1) ? HIGH : LOW);
		digitalWrite(PIN_DATA_0 + 2, ((bufferedByte >> 2) & 1) ? HIGH : LOW);
		digitalWrite(PIN_DATA_0 + 3, ((bufferedByte >> 4) & 1) ? HIGH : LOW); // [sic] wiring
		digitalWrite(PIN_DATA_0 + 4, ((bufferedByte >> 5) & 1) ? HIGH : LOW);
		digitalWrite(PIN_DATA_0 + 5, ((bufferedByte >> 6) & 1) ? HIGH : LOW);
		digitalWrite(PIN_DATA_0 + 6, ((bufferedByte >> 7) & 1) ? HIGH : LOW);
		digitalWrite(PIN_DATA_0 + 7, ((bufferedByte >> 3) & 1) ? HIGH : LOW);

		noInterrupts();
		
		digitalWrite(PIN_ROM_SUPPRESS, HIGH);
		pinMode(PIN_ROM_SUPPRESS, OUTPUT);
		for (int pin = PIN_DATA_0; pin <= PIN_DATA_7; pin += 1) {
			pinMode(pin, OUTPUT);
		}
		digitalWrite(PIN_SIGNAL_OUTPUT, HIGH);
		pinMode(PIN_SIGNAL_OUTPUT, OUTPUT);
		
		for (int i = 0; i < 10; i += 1) { ; }
		
		//delayMicroseconds(3); // "This function works very accurately in the range 3 microseconds and up. We cannot assure that delayMicroseconds will perform precisely for smaller delay-times." - https://www.arduino.cc/reference/en/language/functions/time/delaymicroseconds/
		
		pinMode(PIN_SIGNAL_OUTPUT, INPUT);
		for (int pin = PIN_DATA_0; pin <= PIN_DATA_7; pin += 1) {
			pinMode(pin, INPUT);
		}
		pinMode(PIN_ROM_SUPPRESS, INPUT);

		interrupts();

		waitOneClockCycle();
		waitOneClockCycle();

		Serial.print("k: ");
		Serial.print(bufferedByte, HEX);
		Serial.println();


	}

}
