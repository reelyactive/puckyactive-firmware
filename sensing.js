/**
 * Copyright reelyActive 2017
 * We believe in an open Internet of Things
 */


// User-configurable constants
const ADVERTISING_INTERVAL_MILLISECONDS = 500;
const SENSING_INTERVAL_MILLISECONDS = 1000;
const LED_BLINK_MILLISECONDS = 200;
const ENABLE_BATTERY_VOLTAGE = true;
const ENABLE_TEMPERATURE = true;
const ENABLE_LIGHT_SENSOR = true;
const ENABLE_CAP_SENSE = true;
const ENABLE_MAGNETOMETER = true;
const ENABLE_NFC = false;

// BLE constants
const FLAGS_GAP_LENGTH = 0x02;
const FLAGS_GAP_TYPE = 0x01;
const MANUFACTURER_SPECIFIC_DATA_GAP_TYPE = 0xff;

// puckyActive constants
const COMPANY_CODE_MSB = 0x05;
const COMPANY_CODE_LSB = 0x83;
const FRAME_TYPE = 0x02;
const FRAME_LENGTH = 0x0b;
const MANUFACTURER_SPECIFIC_DATA_LENGTH_OFFSET = 3;
const PACKET_COUNT_LENGTH_OFFSET = 8;
const BATTERY_VOLTAGE_FLAG = 0x01;
const TEMPERATURE_FLAG = 0x02;
const LIGHT_SENSOR_FLAG = 0x04;
const CAP_SENSE_FLAG = 0x08;
const MAGNETOMETER_FLAG = 0x10;
const NFC_FLAG = 0x20;
const MAX_BATTERY_VOLTAGE = 3.6;
const MIN_BATTERY_VOLTAGE = 2.0;
const MAX_TEMPERATURE = 85;
const MIN_TEMPERATURE = -40;
const TEMPERATURE_DEGREES_PER_UNIT = 0.5;
const MAX_CAP_SENSE = 262144;

// Global variables
var gCyclicCount = 0;
var gIsSleeping = false;
var gMainIntervalId;


/**
 * Initialise the packet that will be advertised.
 * @param {Number} per The active peripherals byte
 * @param {Number} bat The battery voltage byte
 * @param {Number} tmp The temperature byte
 * @param {Number} lgt The light level byte
 * @param {Number} cap The cap sense level byte
 * @param {Array} mag The X, Y and Z magnetic readings
 * @param {function} callback The function to call on completion.
 */
function initialiseAdvertisingPacket(per, bat, tmp, lgt, cap, mag, callback) {
  var packet = [
    FLAGS_GAP_LENGTH,
    FLAGS_GAP_TYPE,
    0x06, // LE general discoverable, BR/EDR not supported
    0x10, // Length of manufacturer specific data
    MANUFACTURER_SPECIFIC_DATA_GAP_TYPE,
    COMPANY_CODE_LSB,
    COMPANY_CODE_MSB,
    FRAME_TYPE,
    FRAME_LENGTH,
    per,
    bat,
    tmp,
    lgt,
    cap,
    mag[0],
    mag[1],
    mag[2],
    mag[3],
    mag[4],
    mag[5]
  ];
  return callback(packet);
}


/**
 * Increment the cyclic count of the given packet.
 * @param {Array} packet The packet that will be advertised.
 */
function incrementCyclicCount(packet) {
  if(++gCyclicCount > 0x07) {
    gCyclicCount = 0;
  }
  packet[PACKET_COUNT_LENGTH_OFFSET] += (gCyclicCount << 5);
}


/**
 * Encode the active peripherals.
 * @return {Number} The active peripheral flags as a byte.
 */
function getActivePeripherals() {
  var per = 0;
  
  if(ENABLE_BATTERY_VOLTAGE) {
    per |= BATTERY_VOLTAGE_FLAG;
  }
  if(ENABLE_TEMPERATURE) {
    per |= TEMPERATURE_FLAG;
  }
  if(ENABLE_LIGHT_SENSOR) {
    per |= LIGHT_SENSOR_FLAG;
  }
  if(ENABLE_CAP_SENSE) {
    per |= CAP_SENSE_FLAG;
  }
  if(ENABLE_LIGHT_SENSOR) {
    per |= LIGHT_SENSOR_FLAG;
  }
  if(ENABLE_MAGNETOMETER) {
    per |= MAGNETOMETER_FLAG;
  }
  if(ENABLE_NFC) {
    per |= NFC_FLAG;
  }
  
  return per;
}


/**
 * Encode the battery voltage.
 * @return {Number} The encoded battery voltage as a byte.
 */
function encodeBatteryVoltage() {
  if(!ENABLE_BATTERY_VOLTAGE) {
    return 0;  
  }
  
  var voltage = NRF.getBattery();
  
  if(voltage <= MIN_BATTERY_VOLTAGE) {
    return 0x00;
  }
  if(voltage >= MAX_BATTERY_VOLTAGE) {
    return 0xff;
  }

  return Math.round(0xff * (voltage - MIN_BATTERY_VOLTAGE) /
         (MAX_BATTERY_VOLTAGE - MIN_BATTERY_VOLTAGE));
}


/**
 * Encode the temperature.
 * @return {Number} The encoded temperature as a byte.
 */
function encodeTemperature() {
  if(!ENABLE_TEMPERATURE) {
    return 0;  
  }
  
  var temperature = E.getTemperature();
  
  if(temperature <= MIN_TEMPERATURE) {
    return 0x00;
  }
  if(temperature >= MAX_TEMPERATURE) {
    return 0xfa;
  }
  
  return Math.round((temperature - MIN_TEMPERATURE) /
                    TEMPERATURE_DEGREES_PER_UNIT);
}


/**
 * Encode the light level.
 * @return {Number} The encoded light level as a byte.
 */
function encodeLightLevel() {
  if(!ENABLE_LIGHT_SENSOR) {
    return 0;  
  }
  
  var light = Puck.light();
  
  return Math.round(0xff * light);
}


/**
 * Encode the cap sense level.
 * @return {Number} The encoded cap sense level as a byte.
 */
function encodeCapSense() {
  if(!ENABLE_CAP_SENSE) {
    return 0;  
  }
  
  var capsense = Puck.capSense();
  
  if(capsense >= MAX_CAP_SENSE) {
    return 0xff;
  }
  
  return Math.round(0xff * capsense / MAX_CAP_SENSE);
}


/**
 * Encode the magnetometer readings.
 * @return {Number} The encoded magnetometer readings as an array.
 */
function encodeMagnetometer() {
  var mag = [ 0, 0, 0, 0, 0, 0 ];
  
  if(ENABLE_MAGNETOMETER) {
    var readings = Puck.mag();

    mag[0] = readings.x >> 8;
    mag[1] = readings.x & 0xff;
    mag[2] = readings.y >> 8;
    mag[3] = readings.y & 0xff;
    mag[4] = readings.z >> 8;
    mag[5] = readings.z & 0xff;
  }

  return mag;
}


/**
 * This is the equivalent of the 'main' function
 */
function main() {
  var per = getActivePeripherals();
  
  gMainIntervalId = setInterval(function() {
    var bat = encodeBatteryVoltage();
    var tmp = encodeTemperature();
    var lgt = encodeLightLevel();
    var cap = encodeCapSense();
    var mag = encodeMagnetometer();
    
    initialiseAdvertisingPacket(per, bat, tmp, lgt, cap, mag, function(packet) {
      incrementCyclicCount(packet);
      NRF.setAdvertising(packet, { interval: ADVERTISING_INTERVAL_MILLISECONDS });
    });
  }, SENSING_INTERVAL_MILLISECONDS);
}


/**
 * Watch the button to toggle between sleep and wake
 */
setWatch(function(e) {
  if(gIsSleeping) {
    LED2.write(true); // Green = wake
    setTimeout(function () {
      LED2.write(false);
      gIsSleeping = false;
      NRF.wake();
      main();
    }, LED_BLINK_MILLISECONDS);
  }
  else {
    LED1.write(true); // Red = sleep
    clearInterval(gMainIntervalId);
    setTimeout(function () {
      LED1.write(false);
      gIsSleeping = true;
      NRF.sleep();
    }, LED_BLINK_MILLISECONDS);
  }
}, BTN, { edge: "rising", repeat: true, debounce: 50 });


/**
 * Begin puckyActive execution
 */
main();
