/**
 * Copyright reelyActive 2019
 * We believe in an open Internet of Things
 */


// User-configurable constants
const ADVERTISING_INTERVAL_MILLISECONDS = 1000;
const LED_BLINK_MILLISECONDS = 200;
const SENSOR_UPDATE_INTERVAL = 60;  // Every 60 advertisements (once per minute)


// Other constants
const MAIN_INTERVAL_MILLISECONDS = Math.round(ADVERTISING_INTERVAL_MILLISECONDS / 2);


// Global variables
var gIsSleeping = false;
var gIsPacketUpdated = false;
var gMainIntervalId;
var gAdvertisingCount = 0;
var gUptimeMilliseconds = 0;
var gBatteryVoltage = 0;
var gTemperature = 0;


/**
 * Initialise the advertising options.
 */
const advertisingOptions = {
  interval: ADVERTISING_INTERVAL_MILLISECONDS,
  showName: false
};


/**
 * Initialise the packet that will be advertised.
 */
var packet = [
  0x02, // Length of Flags
  0x01, // Param: Flags
  0x06, // Flags 
  0x03, // Length of Service List
  0x03, // Param: Service List
  0xaa, // Eddystone
  0xfe, //   16-bit UUID
  0x11, // Length of Service Data
  0x16, // Service Data
  0xaa, // Eddystone
  0xfe, //   16-bit UUID
  0x20, // Eddystone-TLM Frame
  0x00, // Version
  0x00, // Battery voltage
  0x00, //   (zero if unknown)
  0x80, // Temperature
  0x00, //   (-128C if unknown)
  0x00, // Advertising count
  0x00, //   (number of
  0x00, //   advertisement frames
  0x00, //   since last reboot)
  0x00, // Uptime
  0x00, //   (time since
  0x00, //   last reboot with
  0x00  //   0.1s resolution)
];


/**
 * Update the battery and temperature sensor readings
 */
function updateSensorReadings() {
  var isUpdateDue = ((gAdvertisingCount % SENSOR_UPDATE_INTERVAL) === 0);

  if(isUpdateDue) {
    gBatteryVoltage = NRF.getBattery();
    gTemperature = E.getTemperature();
  }
}


/**
 * Update the contents of the advertising packet
 */
function updateAdvertisingPacket() {
  var batteryMillivolts = Math.round(gBatteryVoltage * 1000);
  var temperature = Math.round(gTemperature);

  gAdvertisingCount++;
  gUptimeMilliseconds += ADVERTISING_INTERVAL_MILLISECONDS;
  var uptimeTenths = Math.round(gUptimeMilliseconds / 100);

  packet[13] = (batteryMillivolts >> 8) & 0xff;
  packet[14] = batteryMillivolts & 0xff;
  packet[15] = temperature;  // Not handling sub-zero temperature values
  packet[16] = 0x00;         //   and ignoring fractions of degrees
  packet[17] = (gAdvertisingCount >> 24) & 0xff;  
  packet[18] = (gAdvertisingCount >> 16) & 0xff;
  packet[19] = (gAdvertisingCount >> 8) & 0xff;
  packet[20] = gAdvertisingCount & 0xff;
  packet[21] = (uptimeTenths >> 24) & 0xff;  
  packet[22] = (uptimeTenths >> 16) & 0xff;
  packet[23] = (uptimeTenths >> 8) & 0xff;
  packet[24] = uptimeTenths & 0xff;
}


/**
 * This is the equivalent of the 'main' function
 */
function main() {
  gIsPacketUpdated = false;
  gAdvertisingCount = 0;   // Reset the telemetry counts
  gUptimeMilliseconds = 0; //   on each restart

  gMainIntervalId = setInterval(function () {
    if(gIsPacketUpdated) {
      NRF.setAdvertising(packet, advertisingOptions);
      gIsPacketUpdated = false;
    }
    else {
      updateSensorReadings();
      updateAdvertisingPacket();
      gIsPacketUpdated = true;
    }
  }, MAIN_INTERVAL_MILLISECONDS);
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
