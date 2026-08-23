/**
 * Generator for Electronics & Hardware Engineering Knowledge Graph Domain
 * Target: 600-800 nodes, 1300-1900 relations
 */

import { createGraphBuilder } from "../kg_builder_util.js";

export function generateElectronics() {
  const g = createGraphBuilder("Electronics", "Technology");

  // 1. Circuit Laws & Fundamental Theory
  const circuitLaws = [
    ["Ohm's Law", "CircuitLaw", "RELATES", "Voltage, Current, and Resistance (V = I * R)", "FOUNDATION_OF", "DC and AC Electrical Analysis"],
    ["Kirchhoff's Current Law (KCL)", "CircuitLaw", "STATES", "Sum of Currents Entering Node Equals Sum Leaving (Charge Conservation)", "USED_IN", "Nodal Voltage Analysis"],
    ["Kirchhoff's Voltage Law (KVL)", "CircuitLaw", "STATES", "Sum of Directed Potential Differences Around Closed Loop is Zero (Energy Conservation)", "USED_IN", "Mesh Current Analysis"],
    ["Thevenin Theorem", "CircuitTheorem", "SIMPLIFIES", "Linear Two-Terminal Network into Single Voltage Source and Series Resistance", "SPEEDS_UP", "Load Resistance Optimization"],
    ["Norton Theorem", "CircuitTheorem", "REPRESENTS", "Linear Network as Ideal Current Source in Parallel with Internal Resistance", "DUAL_OF", "Thevenin Equivalent"],
    ["RLC Resonance", "Phenomenon", "OCCURS_AT", "Frequency where Inductive and Capacitive Reactances Cancel (f = 1/(2*pi*sqrt(L*C)))", "ENABLES", "RF Tuner and Bandpass Filtering"],
  ];

  for (const row of circuitLaws) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} in electrical engineering.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 2. Semiconductor Devices & Physics
  const semiconductors = [
    ["PN Junction Diode", "SemiconductorDevice", "ALLOWS", "Unidirectional Current Flow Forward-Biased", "BLOCKS", "Reverse Current up to Breakdown Voltage"],
    ["Zener Diode", "SemiconductorDevice", "MAINTAINS", "Constant Voltage under Reverse Breakdown", "USED_FOR", "Voltage Reference and Clamp Regulation"],
    ["Schottky Diode", "SemiconductorDevice", "FEATURES", "Metal-Semiconductor Junction with Ultra-Low Forward Voltage Drop (0.2V-0.3V)", "OPTIMIZED_FOR", "High-Frequency Switching Power Supplies"],
    ["MOSFET (Metal-Oxide-Semiconductor FET)", "Transistor", "CONTROLS", "Drain-to-Source Current via Voltage on Insulated Gate", "OPERATES_IN", "Cutoff, Linear (Triode), and Saturation Regions"],
    ["N-Channel Enhancement MOSFET", "Transistor", "CONDUCTS_WHEN", "Gate-to-Source Voltage Exceeds Positive Threshold Vgs(th)", "ACTS_AS", "Low-Side Switch in Power Converters"],
    ["P-Channel Enhancement MOSFET", "Transistor", "CONDUCTS_WHEN", "Gate Voltage is Pulled Below Source Potential", "ACTS_AS", "High-Side Power Rail Switch"],
    ["BJT (Bipolar Junction Transistor)", "Transistor", "AMPLIFIES", "Collector Current Proportional to Small Base Current (Ic = Beta * Ib)", "AVAILABLE_AS", "NPN and PNP Polarities"],
    ["IGBT (Insulated-Gate Bipolar Transistor)", "PowerDevice", "COMBINES", "High Gate Input Impedance of MOSFET with High Current Handling of BJT", "POWERS", "Electric Vehicle Inverters and Induction Heaters"],
    ["Gallium Nitride (GaN) Transistor", "WideBandgapDevice", "DELIVERS", "High Electron Mobility and Nanosecond Switching", "SHRINKS", "Compact USB-C Fast Chargers"],
    ["Silicon Carbide (SiC) MOSFET", "WideBandgapDevice", "OPERATES_AT", "Voltages Above 1200V and High Junction Temperatures", "POWERS", "High-Voltage Solar Inverters and EV Powertrains"],
  ];

  for (const row of semiconductors) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} semiconductor component.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 3. Analog Signal Conditioning & Operational Amplifiers
  const analogComponents = [
    ["Operational Amplifier (Op-Amp)", "AnalogIC", "EXHIBITS", "Near-Infinite Open-Loop Gain and High Input Impedance", "CONFIGURED_VIA", "Negative Feedback Loops"],
    ["Inverting Op-Amp Amplifier", "CircuitTopology", "PROVIDES", "Gain Determined by Ratio -Rf/Rin with 180 Degree Phase Inversion", "FEATURES", "Virtual Ground at Inverting Node"],
    ["Non-Inverting Op-Amp Amplifier", "CircuitTopology", "PROVIDES", "Gain (1 + Rf/R1) with High Input Impedance", "IDEAL_FOR", "Sensor Buffer Amplification"],
    ["Differential Amplifier", "CircuitTopology", "AMPLIFIES", "Voltage Difference between Two Inputs while Rejecting Common-Mode Noise", "MEASURES", "Current Shunt Resistor Voltages"],
    ["Instrumentation Amplifier", "PrecisionAnalogIC", "INTEGRATES", "Three Op-Amps with Laser-Trimmed Resistors", "EXTRACTS", "Microvolt Strain Gauge and ECG Signals"],
    ["Comparator (LM393)", "AnalogIC", "SWITCHES", "Output High/Low when Input Crosses Reference Threshold Without Negative Feedback", "FEATURES", "Open-Collector Output"],
    ["Active Low-Pass Sallen-Key Filter", "FilterTopology", "ATTENUATES", "High-Frequency Noise Above Cutoff Frequency", "ACTS_AS", "Anti-Aliasing Filter for ADCs"],
    ["ADC (Analog-to-Digital Converter)", "MixedSignalIC", "SAMPLES_AND_QUANTIZES", "Continuous Analog Voltage into Binary Word", "CHARACTERIZED_BY", "Sampling Rate (SPS) and Resolution (Bits)"],
    ["DAC (Digital-to-Analog Converter)", "MixedSignalIC", "RECONSTRUCTS", "Continuous Voltage Waveform from Discrete Digital Values", "USED_IN", "Audio Synthesizers and Signal Generators"],
    ["NE555 Timer IC", "TimerIC", "GENERATES", "Accurate Time Delays or Oscillations in Astable and Monostable Modes", "POWERS", "Pulse Width Modulation and Tone Generators"],
  ];

  for (const row of analogComponents) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} analog system.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 4. Microcontrollers, Embedded Architectures & Peripherals
  const embeddedSystems = [
    ["ESP32 Microcontroller", "EmbeddedSoC", "INTEGRATES", "Dual-Core Xtensa 240MHz CPU, Wi-Fi 802.11b/g/n, and Bluetooth 4.2/5.0 BLE", "POWERS", "IoT Smart Home Devices and Robotics"],
    ["STM32 (ARM Cortex-M)", "MicrocontrollerFamily", "DELIVERS", "High-Performance 32-Bit ARM Cores with Hardware FPU and DMA", "DOMINATES", "Industrial Automation and Drone Flight Controllers"],
    ["RP2040 (Raspberry Pi)", "Microcontroller", "FEATURES", "Dual ARM Cortex-M0+ Cores with Programmable I/O (PIO) State Machines", "ENABLES", "Bit-Banged High-Speed Hardware Protocols"],
    ["ATmega328P", "8BitMCU", "FEATURES", "AVR Harvard RISC Architecture with 32KB Flash and 2KB SRAM", "FOUNDATION_OF", "Arduino Uno Development Boards"],
    ["FreeRTOS", "EmbeddedOS", "MANAGES", "Preemptive Multitasking, Semaphore Locking, and Task Scheduling on Microcontrollers", "ENABLES", "Deterministic Real-Time Firmware"],
    ["DMA (Direct Memory Access)", "HardwareController", "TRANSFERS", "Data between Peripherals and RAM Without CPU Intervention", "MAXIMIZES", "ADC and SPI Data Throughput"],
    ["PWM (Pulse Width Modulation)", "PeripheralTimer", "VARIES", "Duty Cycle of Fixed Frequency Square Wave", "CONTROLS", "Motor Speed, LED Dimming, and Servo Position"],
  ];

  for (const row of embeddedSystems) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} embedded hardware.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 5. Digital Communication Protocols & Buses
  const commBuses = [
    ["I2C Bus (Inter-Integrated Circuit)", "SerialBus", "USES", "Two Bidirectional Open-Drain Lines: SDA (Data) and SCL (Clock)", "REQUIRES", "Pull-up Resistors to VCC Rail"],
    ["SPI Bus (Serial Peripheral Interface)", "SynchronousBus", "OPERATES", "Full-Duplex Master-Slave with MOSI, MISO, SCK, and CS Lines", "ACHIEVES", "High Data Rates up to 50MHz+ for Displays and SD Cards"],
    ["UART (Universal Asynchronous Receiver-Transmitter)", "SerialInterface", "TRANSMITS", "Asynchronous Byte Frames with Start, Data, Parity, and Stop Bits via TX/RX Lines", "RELIANT_ON", "Pre-Configured Baud Rates (e.g. 115200)"],
    ["CAN Bus (Controller Area Network)", "DifferentialBus", "PROVIDES", "Message-Based Multi-Master Arbitration with Robust Differential CANH/CANL Signals", "STANDARD_IN", "Automotive and Heavy Industrial Vehicles"],
    ["USB 2.0 / USB-C", "HighSpeedBus", "TRANSMITS", "Differential D+/D- Signals with Power Delivery Negotiation (USB-PD up to 240W)", "UNIVERSAL_IN", "Modern Consumer Electronics"],
    ["BLE (Bluetooth Low Energy)", "WirelessProtocol", "OPERATES", "In 2.4GHz ISM Band using Advertising Packets and GATT Profiles", "OPTIMIZED_FOR", "Years-Long Coin-Cell Battery Sensor Beacons"],
  ];

  for (const row of commBuses) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} communication standard.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 6. Power Electronics, Regulators & PCB Design Rules
  const powerAndPcb = [
    ["Buck Converter (Step-Down SMPS)", "PowerTopology", "CHORS", "High DC Input Voltage into Lower DC Output with >90% Efficiency", "USES", "High-Side MOSFET, Inductor, Diode, and Output Capacitor"],
    ["Boost Converter (Step-Up SMPS)", "PowerTopology", "CONVERTS", "Low Input DC Voltage to Higher Voltage by Storing Energy in Inductor", "POWERS", "LED Backlights and Solar Harvesting"],
    ["LDO (Low-Dropout Linear Regulator)", "PowerRegulator", "DISSIPATES", "Excess Voltage as Heat to Provide Ripple-Free Clean Output", "PREFERRED_FOR", "RF Radios and Precision Analog Audio"],
    ["Flyback Converter", "IsolatedPowerTopology", "TRANSFERS", "Energy Across High-Frequency Coupled Transformer Core", "STANDARD_IN", "Mains AC-DC Wall Adapters"],
    ["Decoupling Capacitor", "PCBTechnique", "PLACED", "Immediately Adjacent to IC Power VDD and Ground Pins", "SUPPRESSES", "High-Frequency Voltage Dips and Switching Transients"],
    ["Ground Plane", "PCBLayout", "PROVIDES", "Unbroken Low-Impedance Return Path for High-Speed Signals", "MINIMIZES", "Electromagnetic Interference (EMI) Loop Area"],
    ["Differential Pair Routing", "PCBLayout", "ROUTES", "High-Speed Traces (USB, PCIe, Ethernet) with Controlled Impedance and Equal Length", "CANCELS", "Common-Mode Crosstalk Noise"],
    ["ESD Protection Diode Array (TVS)", "ProtectionDevice", "SHUNTS", "Kilovolt Electrostatic Transients Safely to Chassis Ground", "SHIELDS", "Exposed USB and HDMI Connector Pins"],
  ];

  for (const row of powerAndPcb) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} hardware design element.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  return g.exportGraph();
}
