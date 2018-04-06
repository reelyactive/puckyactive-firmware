/**
 * Copyright reelyActive 2018
 * We believe in an open Internet of Things
 */


// User-configurable constants
const ADVERTISING_INTERVAL_MILLISECONDS = 100;
const LED_BLINK_MILLISECONDS = 200;
const NAMESPACE_ID = [ 0xc0, 0xde, 0xb1, 0x0e, 0x1d,
                       0xd1, 0xe0, 0x1b, 0xed, 0x0c ]
const INSTANCE_ID = [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x01 ];

// Global variables
var gIsSleeping = false;
var gMainIntervalId;


/**
 * Initialise the packet that will be advertised.
 */
const packet = [
  0x02, // Length of Flags
  0x01, // Param: Flaggs
  0x06, // Flags 
  0x03, // Length of Service List
  0x03, // Param: Service List
  0xaa, // Eddystone
  0xfe, //   16-bit UUID
  0x17, // Length of Service Data
  0x16, // Service Data
  0xaa, // Eddystone
  0xfe, //   16-bit UUID
  0x00, // Eddystone-UID Frame
  0x00, // Calibrated Tx power at 0m
  NAMESPACE_ID[0],
  NAMESPACE_ID[1],
  NAMESPACE_ID[2],
  NAMESPACE_ID[3],
  NAMESPACE_ID[4],
  NAMESPACE_ID[5],
  NAMESPACE_ID[6],
  NAMESPACE_ID[7],
  NAMESPACE_ID[8],
  NAMESPACE_ID[9],
  INSTANCE_ID[0],
  INSTANCE_ID[1],
  INSTANCE_ID[2],
  INSTANCE_ID[3],
  INSTANCE_ID[4],
  INSTANCE_ID[5],
  0x00, // RFU
  0x00  // RFU
];


/**
 * Initialise the advertising options.
 */
const advertisingOptions = {
  interval: ADVERTISING_INTERVAL_MILLISECONDS,
  showName: false
};


/**
 * This is the equivalent of the 'main' function
 */
function main() {
  NRF.setAdvertising(packet, advertisingOptions);
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
