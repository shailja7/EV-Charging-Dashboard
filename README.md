
# Smart EV Charging Station with Dynamic Load Management

A professional IoT dashboard for real-time monitoring and energy management of a grid-aware EV charging station. This project features autonomous load balancing and solar-priority logic, designed specifically for a B.Tech final year project.

## Live Demo
Check out the live dashboard: [https://smart-ev-dashboard.vercel.app](https://smart-ev-dashboard.vercel.app)

## Core Features
*   **Dynamic Load Management (DLM)**: Real-time firmware algorithm on ESP32 to throttle charging current during household power spikes.
*   **Solar-Priority Logic**: Prioritizes locally generated PV power over grid utility using SCT-013 and PZEM sensors.
*   **Multi-User Authentication**: Integrated RFID-based security for authorized charging sessions.
*   **IoT Analytics Dashboard**: Responsive Next.js interface for remote energy tracking and system control.

## Technical Stack

### Hardware & Firmware
*   ESP32 Microcontroller (C++, Arduino Framework)
*   SCT-013 & PZEM-004T Power Sensors
*   RC522 RFID Module
*   MQTT Communication Protocol

### Software & Frontend
*   Next.js 14 (App Router)
*   Tailwind CSS (Glassmorphism UI)
*   Framer Motion (Animations)
*   Recharts (Data Visualization)
*   Node-RED (Backend Bridge)


