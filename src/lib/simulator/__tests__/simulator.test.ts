import { describe, expect, it } from "vitest";
import { parseFirmwareProject } from "../parser/parser";
import { analyzeFirmware } from "../analyzer/analyzer";
import { EmoFirmwareRuntime } from "../interpreter/runtime";
import { VirtualSSD1306, SSD1306_WHITE } from "../oled/ssd1306";
import { getDefaultPersistedModules, HARDWARE_MODULES } from "../modules/registry";
import { executeModuleExtension, rollbackModuleExtension } from "../extension/engine";
import { DEFAULT_HARDWARE_CONFIG, type FirmwareFileData } from "../types";

function makeFile(path: string, content: string): FirmwareFileData {
  const name = path.split("/").pop() || path;
  const dot = name.lastIndexOf(".");
  return {
    id: `f_${name}`,
    path,
    name,
    extension: dot >= 0 ? name.slice(dot) : ".ino",
    content,
    sizeBytes: Buffer.byteLength(content, "utf8"),
  };
}

describe("EMO VIRTUAL BODY — Full Subsystem & Acceptance Tests (A–J)", () => {
  it("Test A: Starts with a completely empty neutral robot and blank 128x64 OLED", () => {
    const rt = new EmoFirmwareRuntime(DEFAULT_HARDWARE_CONFIG);
    const snap = rt.getSnapshot();
    expect(snap.state).toBe("IDLE");
    expect(snap.oledActivePixels).toBe(0);
    expect(snap.oledFrameCount).toBe(0);
    expect(snap.oledInitialized).toBe(false);
    expect(rt.serialLogs.length).toBe(0);
  });

  it("Test B & C & D: Multi-file AST parsing, automatic analysis, and honest Capability Report", () => {
    const header = makeFile(
      "faces.h",
      `
      enum Face { NORMAL, HAPPY, SLEEP_FACE };
      const uint8_t ICON_8X8[] PROGMEM = { 0xFF, 0x81, 0x81, 0xFF, 0x81, 0x81, 0x81, 0xFF };
      `
    );
    const main = makeFile(
      "emo_main.ino",
      `
      #include <Wire.h>
      #include <Adafruit_GFX.h>
      #include <Adafruit_SSD1306.h>
      #include <Preferences.h>
      #include <WiFi.h>
      #include "faces.h"

      #define SCREEN_WIDTH 128
      #define SCREEN_HEIGHT 64
      #define TOUCH_MAIN 27
      #define TOUCH_WAKE 18

      Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
      Preferences prefs;
      Face currentFace = NORMAL;

      void setup() {
        Serial.begin(115200);
        pinMode(TOUCH_MAIN, INPUT);
        display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
        prefs.begin("emo", false);
        WiFi.begin("LabNet", "pass");
      }

      void loop() {
        if (digitalRead(TOUCH_MAIN) == HIGH) {
          currentFace = HAPPY;
        }
      }
      `
    );

    const parsed = parseFirmwareProject([main, header]);
    expect(parsed.missingSourceFiles).toEqual([]);
    expect(parsed.invalidSyntaxNodes).toBe(0);

    const modules = getDefaultPersistedModules();
    const { analysisReport, capabilityReport } = analyzeFirmware([main, header], modules);

    expect(analysisReport.hasSetup).toBe(true);
    expect(analysisReport.hasLoop).toBe(true);
    expect(analysisReport.canExecute).toBe(true);
    expect(analysisReport.enums.some((e) => e.name === "Face")).toBe(true);
    expect(analysisReport.gpioUsage.some((g) => g.resolvedPin === 27)).toBe(true);

    const oledCap = capabilityReport.find((c) => c.moduleId === "ssd1306_oled")!;
    const prefsCap = capabilityReport.find((c) => c.moduleId === "preferences_nvs")!;
    const wifiCap = capabilityReport.find((c) => c.moduleId === "wifi_esp32")!;
    const bleCap = capabilityReport.find((c) => c.moduleId === "bluetooth_ble")!;

    expect(oledCap.detected).toBe(true);
    expect(oledCap.simulatorSupport).toBe("SUPPORTED");

    expect(prefsCap.detected).toBe(true);
    expect(prefsCap.simulatorSupport).toBe("UNSUPPORTED");
    expect(prefsCap.canImplementSupport).toBe(true);

    expect(wifiCap.detected).toBe(true);
    expect(wifiCap.simulatorSupport).toBe("UNSUPPORTED");

    expect(bleCap.detected).toBe(false);
    expect(bleCap.implementationStatus).toBe("NOT_DETECTED");
  });

  it("Test E: IMPLEMENT SUPPORT genuinely extends browser-simulatable modules, runs tests, reanalyses, rolls back, and refuses impossible hardware", () => {
    const fw = [
      makeFile(
        "storage_and_ble.ino",
        `
        #include <Preferences.h>
        #include <BluetoothSerial.h>
        #include <driver/i2s.h>
        Preferences prefs;
        BluetoothSerial SerialBT;
        void setup() {
          prefs.begin("emo", false);
          prefs.putInt("score", 42);
          i2s_driver_install(0, 0, 0);
          SerialBT.begin("EMO");
        }
        void loop() {}
        `
      ),
    ];

    const baseModules = getDefaultPersistedModules();

    // 1. Browser-simulatable FULL module (Preferences / NVS) -> SUPPORTED
    const extPrefs = executeModuleExtension("preferences_nvs", baseModules, fw);
    expect(extPrefs.success).toBe(true);
    expect(extPrefs.finalStatus).toBe("SUPPORTED");
    expect(extPrefs.testResult.allPassed).toBe(true);
    expect(extPrefs.testResult.passed).toBeGreaterThanOrEqual(4);
    expect(
      extPrefs.reanalysis?.capabilityReport.find((c) => c.moduleId === "preferences_nvs")
        ?.simulatorSupport
    ).toBe("SUPPORTED");

    // 2. Rollback restores original UNSUPPORTED state cleanly
    const updatedMods = baseModules.map((m) =>
      m.id === "preferences_nvs" ? extPrefs.updatedModule : m
    );
    const rb = rollbackModuleExtension("preferences_nvs", updatedMods, fw);
    expect(rb.updatedModule.enabled).toBe(false);
    expect(rb.updatedModule.supportLevel).toBe("UNSUPPORTED");
    expect(
      rb.reanalysis?.capabilityReport.find((c) => c.moduleId === "preferences_nvs")
        ?.simulatorSupport
    ).toBe("UNSUPPORTED");

    // 3. Browser-simulatable PARTIAL module (Microphone I2S) -> PARTIALLY_SUPPORTED (honest!)
    const extMic = executeModuleExtension("microphone_i2s", baseModules, fw);
    expect(extMic.success).toBe(true);
    expect(extMic.finalStatus).toBe("PARTIALLY_SUPPORTED");
    expect(extMic.updatedModule.supportLevel).toBe("PARTIALLY_SUPPORTED");

    // 4. Browser IMPOSSIBLE module (Bluetooth Classic / BLE GATT) -> FAILED, never falsely marked SUPPORTED!
    const extBle = executeModuleExtension("bluetooth_ble", baseModules, fw);
    expect(extBle.success).toBe(false);
    expect(extBle.finalStatus).toBe("FAILED");
    expect(extBle.updatedModule.enabled).toBe(false);
    expect(extBle.updatedModule.supportLevel).toBe("UNSUPPORTED");
  });

  it("Test F, G & H: Executes firmware safely, responds to virtual touch input on GPIO27, and renders exact 128x64 OLED output", () => {
    const fw = [
      makeFile(
        "emo_interactive.ino",
        `
        #include <Wire.h>
        #include <Adafruit_GFX.h>
        #include <Adafruit_SSD1306.h>

        #define TOUCH_MAIN 27
        Adafruit_SSD1306 display(128, 64, &Wire, -1);

        int touchCount = 0;
        bool lastTouch = false;

        void drawNormal() {
          display.clearDisplay();
          display.fillRect(30, 20, 20, 20, SSD1306_WHITE);
          display.fillRect(78, 20, 20, 20, SSD1306_WHITE);
          display.display();
        }

        void drawHappy() {
          display.clearDisplay();
          display.fillCircle(40, 32, 12, SSD1306_WHITE);
          display.fillCircle(88, 32, 12, SSD1306_WHITE);
          display.setCursor(44, 52);
          display.print("HAPPY");
          display.display();
        }

        void setup() {
          Serial.begin(115200);
          pinMode(TOUCH_MAIN, INPUT);
          display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
          drawNormal();
          Serial.println("BOOT_OK");
        }

        void loop() {
          bool pressed = digitalRead(TOUCH_MAIN) == HIGH;
          if (pressed && !lastTouch) {
            touchCount++;
            drawHappy();
            Serial.print("TOUCH_");
            Serial.println(touchCount);
          }
          lastTouch = pressed;
          delay(10);
        }
        `
      ),
    ];

    const rt = new EmoFirmwareRuntime(DEFAULT_HARDWARE_CONFIG);
    const build = rt.build(fw);
    expect(build.ok).toBe(true);

    rt.start();
    rt.step(16);

    // Verify setup() drew exact two 20x20 squares = 800 pixels!
    expect(rt.oled.getActivePixelCount()).toBe(800);
    expect(rt.oled.getPixel(35, 25)).toBe(1);
    expect(rt.oled.getPixel(64, 32)).toBe(0);
    expect(rt.serialLogs.some((l) => l.text.includes("BOOT_OK"))).toBe(true);

    // Test G: Trigger Main Touch sensor (GPIO27) and advance simulation past delay(10)
    rt.setTouchSensor("MAIN_TOUCH", true);
    rt.step(20);

    // Firmware should have received HIGH, incremented touchCount, drawn happy circles + text, and logged TOUCH_1
    const snap = rt.getSnapshot();
    expect(snap.variables.touchCount?.value).toBe("1");
    expect(rt.oled.getActivePixelCount()).not.toBe(800);
    expect(rt.oled.getPixel(40, 32)).toBe(1);
    expect(rt.serialLogs.some((l) => l.text.includes("TOUCH_1"))).toBe(true);
    expect(rt.touchHistory.length).toBe(1);
  });

  it("Test H (OLED): Verifies clearDisplay(), drawBitmap(), and non-blocking delay()", () => {
    const oled = new VirtualSSD1306(128, 64);
    oled.begin();
    oled.drawBitmap(0, 0, [0b11110000, 0b00001111], 8, 2, SSD1306_WHITE);
    oled.display();
    expect(oled.getActivePixelCount()).toBe(8);
    expect(oled.getPixel(0, 0)).toBe(1);
    expect(oled.getPixel(4, 0)).toBe(0);
    expect(oled.getPixel(4, 1)).toBe(1);

    oled.clearDisplay();
    oled.display();
    expect(oled.getActivePixelCount()).toBe(0);
  });

  it("Test J: Invalid syntax, missing local headers, and infinite loops are caught safely", () => {
    // 1. Broken syntax
    const broken = [
      makeFile(
        "broken.ino",
        `
        #include "does_not_exist.h"
        void setup() {
          int x = ;
          Serial.println("unclosed string
        }
        `
      ),
    ];

    const { analysisReport } = analyzeFirmware(broken);
    expect(analysisReport.canExecute).toBe(false);
    expect(analysisReport.classification.missingSourceFiles).toContain("does_not_exist.h");
    expect(analysisReport.diagnostics.some((d) => d.severity === "error")).toBe(true);

    const rtBroken = new EmoFirmwareRuntime(DEFAULT_HARDWARE_CONFIG);
    const buildRes = rtBroken.build(broken);
    expect(buildRes.ok).toBe(false);
    expect(rtBroken.state).toBe("ERROR");

    // 2. Infinite loop safety budget prevents browser freeze
    const infLoop = [
      makeFile(
        "infinite.ino",
        `
        int counter = 0;
        void setup() {}
        void loop() {
          while (true) {
            counter++;
          }
        }
        `
      ),
    ];
    const rtInf = new EmoFirmwareRuntime(DEFAULT_HARDWARE_CONFIG);
    rtInf.setLimits(2000, 32);
    expect(rtInf.build(infLoop).ok).toBe(true);
    rtInf.start();
    const t0 = Date.now();
    rtInf.step(16);
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(500);
    expect(rtInf.instructionsExecuted).toBeGreaterThan(0);
    expect(rtInf.state).toBe("RUNNING");
  });

  it("Test E (Runtime): Extended Preferences/NVS module persists values live after IMPLEMENT SUPPORT", () => {
    const fw = [
      makeFile(
        "nvs_test.ino",
        `
        #include <Preferences.h>
        Preferences prefs;
        int loadedScore = -1;
        void setup() {
          prefs.begin("emo", false);
          prefs.putInt("high", 77);
          loadedScore = prefs.getInt("high", 0);
        }
        void loop() {}
        `
      ),
    ];

    // Before IMPLEMENT SUPPORT: module disabled -> logs warning and returns default 0
    const baseMods = getDefaultPersistedModules();
    const rtBefore = new EmoFirmwareRuntime(DEFAULT_HARDWARE_CONFIG, baseMods);
    expect(rtBefore.build(fw).ok).toBe(true);
    rtBefore.start();
    rtBefore.step(16);
    expect(rtBefore.getSnapshot().variables.loadedScore?.value).toBe("0");
    expect(rtBefore.serialLogs.some((l) => l.direction === "warn" && l.text.includes("UNSUPPORTED API"))).toBe(true);

    // After IMPLEMENT SUPPORT: module enabled -> genuinely persists and reads back 77!
    const ext = executeModuleExtension("preferences_nvs", baseMods, fw);
    const nextMods = baseMods.map((m) => (m.id === "preferences_nvs" ? ext.updatedModule : m));
    const rtAfter = new EmoFirmwareRuntime(DEFAULT_HARDWARE_CONFIG, nextMods);
    expect(rtAfter.build(fw).ok).toBe(true);
    rtAfter.start();
    rtAfter.step(16);
    expect(rtAfter.getSnapshot().variables.loadedScore?.value).toBe("77");
    expect(rtAfter.getSnapshot().nvsStorage.emo?.high).toBe(77);
  });

  it("All built-in & extendable hardware modules execute clean self-tests", () => {
    for (const mod of HARDWARE_MODULES) {
      const res = mod.runTests();
      if (mod.browserSimulatable === "IMPOSSIBLE") {
        expect(res.allPassed).toBe(false);
      } else {
        expect(res.allPassed).toBe(true);
        expect(res.total).toBeGreaterThan(0);
      }
    }
  });
});
