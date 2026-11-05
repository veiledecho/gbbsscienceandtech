import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

const hardware = [
  { slug: "arduino-uno-r3", name: "Arduino Uno R3", category: "Microcontrollers", qty: 12, specs: "5V ATmega328P; 14 digital I/O (6 PWM); 6 analog inputs", location: "Drawer A-01 · Main MCU Rack", pinout: { digital: "D0-D13", analog: "A0-A5", power: "5V, 3.3V, GND, Vin" } },
  { slug: "esp32-devkit", name: "ESP32 NodeMCU DevKit", category: "Microcontrollers", qty: 8, specs: "Dual-core 240MHz; Wi-Fi 802.11 b/g/n and BLE; 3.3V logic", location: "Drawer A-02 · IoT Rack", pinout: { gpio: "GPIO 0-39", i2c: "SDA 21, SCL 22", power: "3.3V, GND" } },
  { slug: "mq2-gas-sensor", name: "MQ-2 Gas & Smoke Detector", category: "Environmental Sensors", qty: 7, specs: "Combustible gas, LPG, and smoke detection; analog and digital output", location: "Drawer B-01 · Environmental Kit", pinout: { pins: "VCC 5V, GND, DO, AO" } },
  { slug: "hc-sr04-ultrasonic", name: "HC-SR04 Ultrasonic Sonar", category: "Motion & Distance", qty: 14, specs: "2cm–400cm non-contact distance measurement; 15° beam angle", location: "Drawer B-04 · Robotics Bin", pinout: { pins: "VCC 5V, TRIG, ECHO, GND" } },
  { slug: "l298n-motor-driver", name: "L298N Dual Motor Driver", category: "Motors & Actuators", qty: 5, specs: "Dual H-bridge; 5V–35V motor supply; 2A per channel peak", location: "Drawer C-01 · Actuators Box", pinout: { control: "IN1-IN4, ENA, ENB", motor: "OUT1-OUT4", power: "12V, 5V, GND" } },
  { slug: "oled-096-i2c", name: "0.96 inch I2C OLED (128x64)", category: "Displays & Power", qty: 6, specs: "SSD1306 monochrome display; I2C address 0x3C", location: "Drawer D-02 · Screens Cabinet", pinout: { pins: "VCC 3.3–5V, GND, SCL, SDA" } },
];

async function main() {
  for (const item of hardware) {
    const { slug, ...data } = item;
    await prisma.hardwareItem.upsert({ where: { slug }, update: {}, create: { slug, ...data, pinout: data.pinout } });
  }

  const demoAuthor = await prisma.user.upsert({
    where: { email: "labcore-demo@invalid.example" },
    update: {},
    create: { id: "labcore-demo-author", email: "labcore-demo@invalid.example", name: "LabCore Demo", role: "FACULTY_ADVISOR" },
  });
  const proposals = [
    {
      slug: "lab-air-quality-sentry", title: "Lab Air Quality Sentry", status: "ACTIVE" as const,
      abstract: "Build a bench-ready air quality monitor that reads environmental sensors and reports status locally. The first release focuses on safe sensor handling, clear calibration notes, and repeatable validation.",
      teamMembers: ["Sample build team"], bomItems: ["Arduino Uno R3", "MQ-2 Gas & Smoke Detector", "0.96 inch I2C OLED (128x64)"],
    },
    {
      slug: "collision-avoidance-rover", title: "Collision-Avoidance Rover", status: "SUBMITTED" as const,
      abstract: "Prototype a small rover that detects nearby obstacles and changes direction. Document motor power isolation, sensor limits, and a controlled test procedure before the first powered run.",
      teamMembers: ["Robotics group"], bomItems: ["Arduino Uno R3", "HC-SR04 Ultrasonic Sonar", "L298N Dual Motor Driver", "SG90 micro servo"],
    },
  ];
  for (const proposalData of proposals) {
    const proposal = await prisma.projectProposal.upsert({
      where: { slug: proposalData.slug }, update: {},
      create: { ...proposalData, leaderId: demoAuthor.id },
    });
    if (proposal.slug === "lab-air-quality-sentry") {
      await prisma.firmwareFile.upsert({
        where: { proposalId_fileName: { proposalId: proposal.id, fileName: "main.ino" } }, update: {},
        create: { proposalId: proposal.id, fileName: "main.ino", language: "cpp", content: "#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  Serial.println(\"Sensor monitor ready\");\n  delay(1000);\n}\n" },
      });
    }
  }

  const bulletins = [
    { slug: "lab-orientation", title: "Lab orientation and bench access", category: "Workshops", content: "New members can book a safety and equipment orientation with a club executive. Complete the session before using soldering benches or powered motor kits." },
    { slug: "esp32-inventory-update", title: "ESP32 and OLED kits cataloged", category: "IoT & Sensors", content: "ESP32 development boards and I2C OLED modules are now available in the inventory. Check the drawer locations and verified pinout notes before checkout." },
  ];
  for (const bulletin of bulletins) {
    await prisma.bulletinPost.upsert({
      where: { slug: bulletin.slug }, update: {},
      create: { ...bulletin, authorId: demoAuthor.id },
    });
  }
  console.log(`Seeded ${hardware.length} hardware records, ${proposals.length} proposals, and ${bulletins.length} bulletins.`);
}

main().finally(async () => prisma.$disconnect());