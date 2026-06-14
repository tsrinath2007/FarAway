# PULSE RAIL — Intelligent Railway Track Safety Net

> **Hackathon Demo Pitch Deck & Dashboard**  
> *"Turning every train into a track inspector to save lives, with zero new hardware."*

---
**WEBSITE URL** :- https://faraway-railway.vercel.app/
## 📖 Concept Overview

**PULSE RAIL** is a story-driven collaborative railway safety system. In traditional systems, track inspections require expensive dedicated inspection cars, optical cameras, or manual track walkers. **PULSE RAIL** eliminates this friction by utilizing the **axle-box accelerometers** already present on modern locomotives. 

As trains travel across the national network, they act as moving sensors, continuously recording structural vibrations. If a train runs over a track defect (such as a structural crack), it instantly logs a severe G-force spike, tags the GPS coordinates, and syncs the data with the cloud. Upcoming trains approaching the same coordinates are notified dynamically and slowed down in advance—automatically preventing derailments.

---

## 🛠 How It Works (Closed-Loop System)

The system operates as a continuous four-step feedback loop:

1. **Detect the Fault**  
   Axle-box accelerometers continuously record vertical vibrations. On-board machine learning models analyze the signals in real time to filter noise and identify abnormal impact patterns (such as a rail fracture).
2. **Store in Database**  
   Detected fault signatures and GPS coordinates are securely uploaded to a centralized cloud database in real time, creating an active track health index map for the entire national network.
3. **Warn the Next Train**  
   Autonomous risk calculation models identify any upcoming trains on the same route. The system sends early warnings directly to the loco pilots and cab signaling systems, giving them ample distance to slow down safely.
4. **Improve the AI**  
   The AI retraining feedback loop ensures that any false alarms or missed anomalies are flagged, feeding outcome data back to the core models to continuously improve detection accuracy.

---

## 📈 Key Highlights & Metrics

*   **87,432 km monitored today** — *Monitored by 13,247 active trains. Done with zero new hardware.*
*   **14 faults detected** — *Average detection and confirmation time of 1.8 seconds.*
*   **9 trains warned in time** — *Derailments avoided. Done with zero new trackside sensors.*

---

## 💻 Tech Stack

*   **Frontend**: React 19 (Hooks, custom hooks)
*   **Styling**: Tailwind CSS v4.0 (Custom dark navy color palette, glassmorphism card layouts)
*   **Icons**: Lucide React
*   **Map Projection**: `@svg-maps/india` (Detailed state boundary outlines and coordinate mapping)
*   **Build Tool**: Vite 8

---

## 🚀 Getting Started

Follow these steps to run the interactive dashboard locally:

### 1. Clone the Repository
```bash
git clone https://github.com/tsrinath2007/FarAway.git
cd FarAway
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser to view the interactive dashboard.

### 4. Build for Production
```bash
npm run build
```

---

## 👥 Team: tsrinath2020

*   **Thota Sai Eswar Srinath** — *Team Lead*
*   **Bondugula Pranav Teja** — *Team Member*
*   **Pushkar Koppeti** — *Team Member*
*   **Nikhil Sai Kadiri** — *Team Member*
*   **BIRUDARAJU ARYABHAT RAJU** — *Team Member*
