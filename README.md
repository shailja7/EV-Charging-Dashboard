# Smart EV Charging Station with Dynamic Load Management

A professional IoT dashboard for real-time monitoring and energy management of a grid-aware EV charging station. This project features autonomous load balancing and solar-priority logic, designed specifically for a B.Tech final year project at MMMUT Gorakhpur.

---

## Live Demo
Check out the live dashboard: [https://smart-ev-charging-dashboard.vercel.app](https://smart-ev-charging-dashboard.vercel.app)

## Core Features
*   **Dynamic Load Management (DLM)**: Real-time firmware algorithm on ESP32 to throttle charging current during household power spikes.
*   **Solar-Priority Logic**: Prioritizes locally generated PV power over grid utility using ACS712 sensors.
*   **12V Prototype Scale**: Tested with 12V 2A AC-DC adapter (18W sanctioned limit), 10W PV panel, and 12V EV toy car battery.
*   **IoT Analytics Dashboard**: Responsive Next.js interface for remote energy tracking and system control.
*   **Downloadable Flowchart**: Built-in printable DLM flowchart mapped directly to firmware line numbers for project presentations.

## Technical Stack

### Hardware & Firmware
*   ESP32 Microcontroller (C++, Arduino Framework)
*   ACS712 Current Sensors & Precision Voltage Divider
*   5kHz PWM & Relay Actuation (MOSFET / DC-DC Converter)
*   Direct WebSockets (`ws://192.168.4.1/ws`) with HTTP Fallback

### Software & Frontend
*   Next.js 14 (App Router, TypeScript)
*   Tailwind CSS (Glassmorphism UI)
*   Framer Motion (Animations)
*   Recharts (Data Visualization in Watts)

## Local Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/shailja7/EV-Charging-Dashboard.git
    cd smart-ev-dashboard
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
4.  View at `http://localhost:3000`

## Project Information
*   **Institution**: Madan Mohan Malaviya University of Technology (MMMUT)
*   **Author**: Shailja Mishra
*   **Field**: Electrical Engineering (2026-2027)

## Contact
*   **LinkedIn**: [linkedin.com/in/shailjamishra](https://linkedin.com/in/shailjamishra)
*   **GitHub**: [github.com/shailja7](https://github.com/shailja7)
