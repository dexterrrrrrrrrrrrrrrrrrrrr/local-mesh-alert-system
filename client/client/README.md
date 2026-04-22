# Hospitality Mesh Emergency System 🚨💬

## Production Ready - BLE + Mock Mesh

**Live servers:**
```
Dev: http://localhost:5173/
Phone network: http://192.168.1.9:3000/
```

## Real BLE Hardware Setup

**Required:** BLE peripheral advertising GATT service `56DE735C-F02B-6E31-55EB-B96359677507`

**ESP32/Arduino code:**
```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

BLEServer* pServer = NULL;
BLECharacteristic *pAlertCharacteristic, *pStatusCharacteristic, *pMessageCharacteristic;

#define SERVICE_UUID "56DE735C-F02B-6E31-55EB-B96359677507"
#define ALERT_CHAR_UUID "0000fff1-0000-1000-8000-00805f9b34fb"
#define STATUS_CHAR_UUID "0000fff2-0000-1000-8000-00805f9b34fb"
#define MESSAGE_CHAR_UUID "0000fff3-0000-1000-8000-00805f9b34fb"

void setup() {
  Serial.begin(115200);
  BLEDevice::init("Mesh Node");
  pServer = BLEDevice::createServer();
  
  BLEService *pService = pServer->createService(SERVICE_UUID);
  
  pAlertCharacteristic = pService->createCharacteristic(
    ALERT_CHAR_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pStatusCharacteristic = pService->createCharacteristic(
    STATUS_CHAR_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );
  pMessageCharacteristic = pService->createCharacteristic(
    MESSAGE_CHAR_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_WRITE
  );
  
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();
  Serial.println("BLE Mesh Node ready!");
}

void loop() {
  delay(2000);
}
```

**Flash ESP32 → Scan → Connect in browser!**

## Quick Mock Test (No Hardware)
1. Multiple tabs/phones same network
2. Mock Mode ON
3. Scan → Connect mock peers
4. Chat syncs everywhere!

## Phone UI Optimized
- Compact mobile layout
- Touch-friendly buttons
- Responsive grids/tabs

**Feature complete for hospitality emergencies!** 🏨🚨
