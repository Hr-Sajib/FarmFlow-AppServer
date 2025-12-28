**FarmFlow : A Real-Time Decision Support
System for Efficient Crop Environment
Management and Community based
Knowledge Sharing**
==================================================
![FarmFlow Banner](https://i.ibb.co.com/LhhFxWFD/github-banner-hardware-farmflow.jpg)

**Overview**
------------

FarmFlow backend powers a **real-time IoT-enabled farming platform**, providing reliable data flow, actuator control, and AI-driven insights. It's designed for **scalability, robustness, and maintainability**.

* * * * *

**Architecture & Tech Stack**
-----------------------------

-   **Server:** Node.js 20 with **Express.js**.

-   **Real-time Communication:** **MQTT** for IoT devices, **Socket.IO** for live dashboard updates.

-   **Databases:**

    -   **MongoDB:** Stores users, farms, chat messages, and metadata.

    -   **InfluxDB:** Time-series storage for sensor data (temperature, humidity, soil moisture, light).

-   **Environment:** Dockerized for deployment, supports production-ready configuration.

-   **Security:** JWT-based authentication and environment variable management.

* * * * *

**Key Features**
----------------

-   **IoT Integration:** Collects sensor data from ESP32 devices and manages actuator commands.

-   **Data Management:** Efficient storage of real-time and historical field data.

-   **AI Integration:** Backend interacts with LLM API to provide field recommendations using SoilGrids data.

-   **Logging & Monitoring:** Tracks sensor events, actuator actions, and API usage for debugging and scaling.

* * * * *

**Highlights**
--------------

-   Fully **Dockerized**, separating backend from frontend.

-   Handles **concurrent IoT connections** with MQTT and websockets.

-   Supports **scalable architecture** for adding new devices, fields, or AI features.

-   Designed for **maintainable and testable production deployment**.

* * * * *

**Impact**
----------

FarmFlow backend enables **real-time, data-driven farming decisions**, ensures **reliable sensor-actuator workflows**, and **facilitates AI-supported advisory services** for modern agriculture.