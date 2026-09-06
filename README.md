# 🌾 FarmFlow API

**A Real-time decision-support platform fused with advisory and community forum for greenhouse and high-value crops and. ESP32 nodes publish over MQTT, readings land in a MongoDB time-series collection, and the same data feeds a live dashboard where weather pattern and soil composition data gets combined from public API-s, a streaming AI advisor, and a auto-moderated community forum.**

<p align="center">
  <a href="https://farmflow-api.sajibofficial.me"><img src="https://img.shields.io/badge/%F0%9F%9F%A2%20LIVE-farmflow--api.sajibofficial.me-16a34a?style=for-the-badge" /></a>
  <img src="https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white" />
</p>

<table>
<tr>
<td width="49%" valign="top">
<img src="https://farmflow-bucket.s3.ap-south-1.amazonaws.com/system-assets/farmflow-fields-dashboard.png" width="100%" alt="FarmFlow fields dashboard" style="border: 1px solid #0000AA; border-radius: 6px;" />

  <img src="https://i.ibb.co.com/LhhFxWFD/github-banner-hardware-farmflow.jpg" width="100%" alt="FarmFlow hardware" /><br/>
  
</td>
<td width="49%" valign="top">
  <img src="https://arbora-bucket.s3.us-east-2.amazonaws.com/system+assets/IMAGE+2026-09-05+22%3A26%3A38.jpg" width="100%" alt="FarmFlow dashboard" />
</td>
</tr>
</table>

---

## ✨ Features

### 🌱 Core

| | | |
|---|---|---|
| 📡 | **Monitoring** | Real-time environmental data, streamed live from every sensor feed on the farm |
| 🎛️ | **Control** | Farmers drive irrigation and shading remotely, straight from the web app |
| 🧭 | **Insights** | Crop-specific AI insights fusing live sensor readings, soil composition and the 3-day forecast — not generic advice |
| 🩺 | **Advisory** | Tiered AI + human advisory — an instant answer, escalated to real expertise when it matters |
| 💬 | **Community** | An AI-moderated forum connecting farmers, their questions and their solutions |

### 🔬 Advanced — under the hood

- 🧠 **Tiered advisory, AI first, human second** — a farmer gets an instant LLM answer grounded in that field's real sensor values, soil profile and crop; a hard case hands off to a verified agronomist with full context, nothing retyped.
- 🌦️ **Three-source insight fusion** — live sensor reading, ISRIC SoilGrids composition and the Open-Meteo 3-day forecast are fetched concurrently and reduced to one advisory prompt, so a recommendation can weigh soil moisture against rain that hasn't landed yet.
- ⏱️ **Native MongoDB time-series** — `farmerId`/`fieldId`/`deviceId` live in an indexed `metaField`, retention is enforced by the database (90-day TTL), and `$dateTrunc` downsamples for charts instead of shipping raw two-second points to a browser.
- 🔌 **Self-healing device identity** — the (frozen) ESP32 firmware ships hardware labels, not field IDs; a short-TTL registry resolves label → field and silently drops orphan readings instead of letting them pile up in a series nobody reads.
- 🖼️ **Vision-moderated forum** — every post goes through a vision model before publishing, with a tri-state verdict (`unset` = in review, not a boolean default that can't tell *waiting* from *rejected*) and fail-closed behavior if moderation errors.
- 📎 **Signed, model-readable attachments** — snapshot images go to the LLM as short-lived signed S3 URLs (not the app's own private-host links, which OpenRouter flatly refuses) so a photo never permanently breaks a conversation.
- 🔁 **Cursor-paged social feed** — `(createdAt, _id)` cursor pagination and follows as unique-indexed edges (not arrays on the user document), so a busy expert's follower list can't blow past MongoDB's 16MB cap.

<sub>Also included: JWT auth with DB-checked roles, passwordless demo accounts, 3-stage password reset, public anonymized read surface, expert/admin stat dashboards, MQTT ingest, image pipeline via Sharp.</sub>

---

## 🏗️ Architecture

```
 ESP32 nodes / simulator ──MQTT (TLS)──▶  HiveMQ Cloud  ──▶  FarmFlow API
        (sensors,                                              │
         actuators)                                    Express 5 + Socket.IO
                                                                │
                          ┌──────────────┬──────────────┬──────┴───────┐
                          ▼              ▼              ▼              ▼
                     MongoDB Atlas   AWS S3         OpenRouter    Next.js client
                    (time-series)   (uploads)      (LLM advisor)   (dashboard)
                                                          ▲
                                        ┌─────────────────┼─────────────────┐
                                        │                 │                 │
                                 Live sensor reading   ISRIC SoilGrids   Open-Meteo
                                  (this field, now)   (soil composition, forecast (7d),
                                                        cached by grid)  cached 30 min
```

**Data fusion for one insight.** A field's advisory card is never one source read in isolation — the live sensor reading, the SoilGrids soil composition for that exact coordinate, and the Open-Meteo forecast for the next 3 days are fetched **concurrently** and reduced to one prompt, so "irrigate now" can weigh soil moisture *and* rain landing in six hours, not soil moisture alone. Either external source failing degrades the advice rather than failing the request — a soil or weather outage is stated in the prompt as "unavailable", never silently coerced to a fake value.

Hardware layer: each node runs two **DHT11** (temp/humidity), two **BH1750** (light), two capacitive **soil-moisture** probes, and drives a **servo** (shade), **stepper** (vents) and **DC motor** (irrigation) — all on an **ESP32**, publishing JSON over MQTT and subscribing to a per-field command topic for actuation.

---

## 🧰 Tech Stack

<p align="center">
<img src="https://img.shields.io/badge/-%20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
<img src="https://img.shields.io/badge/-%20-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/-%20-000000?style=for-the-badge&logo=express&logoColor=white" />
<img src="https://img.shields.io/badge/-%20-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
<img src="https://img.shields.io/badge/-%20-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
<img src="https://img.shields.io/badge/-%20-660066?style=for-the-badge&logo=mqtt&logoColor=white" />
<img src="https://img.shields.io/badge/-%20-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" />
<img src="https://img.shields.io/badge/-%20-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
<img src="https://img.shields.io/badge/-%20-412991?style=for-the-badge&logo=openai&logoColor=white" />
<img src="https://img.shields.io/badge/-%20-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/-%20-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" />
<img src="https://img.shields.io/badge/-%20-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" />
</p>

<p align="center"><sub>Node.js 22 · TypeScript · Express 5 · MongoDB (time-series) · Mongoose · Socket.IO · MQTT.js · AWS S3 SDK · JWT + bcrypt · OpenAI SDK (OpenRouter) · Sharp · Zod · Docker · GitHub Actions · Cloudflare</sub></p>

---

## 🔒 Security (deployment)

The whole stack is self-hosted on a VPS behind a layered edge, not a bare `node server.js` on an open port:

- ➤ **Cloudflare** for DNS, edge proxying, SSL/TLS, WAF & DDoS protection.
- ➤ **Caddy** as the origin reverse proxy, routing traffic to containerized services.
- ➤ **VPS hardening** — UFW, Fail2Ban, SSH key-only auth (password auth and root login disabled).
- ➤ Resolved the classic **Docker–UFW conflict**, where Docker rewrites `iptables` directly and silently bypasses firewall rules unless that gap is closed explicitly.
- ➤ **Docker security** — non-root containers, isolated networks, controlled service-to-service communication (`cap_drop: ALL`, `no-new-privileges`, per-service resource limits).
- ➤ **Tailscale** for private infrastructure access — zero administrative services exposed publicly.
- ➤ **Secure CI/CD** via GitHub Actions, using authenticated, tagged Tailscale access into the production VPS — no open SSH deploys.
- ➤ **Origin protection** — the VPS IP is hidden entirely behind Cloudflare.
- ➤ **Rate limiting** enforced at both the API and proxy layer.

**Application-level, on top of the infra above:**
- Access token in an **httpOnly cookie**; role is read **from the database on every request**, never trusted from the token — a revoked role takes effect immediately.
- One CORS allowlist shared by HTTP and the Socket.IO handshake; **refuses to boot in production** if it's unset, rather than defaulting to wide open.
- Rate limiters key on **`ipKeyGenerator`**, not the raw address — one IPv6 subscriber can hold a whole /64 and shouldn't get a private budget.
- Upload keys are **server-generated, never client-supplied** — blocks path traversal and object-overwrite; SVGs are excluded from the allow-list because they can carry executable script.
- Password reset uses **bcrypt-hashed codes**, a five-attempt cap, and a deliberately generic response so the endpoint can't be used to enumerate registered emails.

---

## 🆕 Recent changes

- Cleared **every known vulnerability** from the production dependency tree.
- Enforced **one CORS allowlist** across HTTP and the socket handshake (previously two settings that drifted, silently killing live telemetry in production).
- Moved the telemetry pulse to **two seconds** and started trusting the reverse proxy for the real client IP.
- Switched attachment/avatar URLs from an API image-proxy to **direct S3 public URLs**.
- Shipped **showcase seeding and a moderation retry path**.
- Resolved **device identity to fields** via a short-TTL registry, and added **passwordless demo sign-in** for reviewers.

---

## 🔍 Engineering notes

The decisions below are the ones worth defending in a review.

### Time-series modelling: why InfluxDB was removed

The original build wrote sensor data to InfluxDB alongside MongoDB, with
`farmerId` and `fieldId` as **fields** rather than **tags**. In InfluxDB tags are
indexed and fields are not, so "this farm's last 24 hours" could not use an index
— it scanned a year across every farm and filtered in application memory.

That is a data-modelling fault, not a database fault, and the same mistake was
available in MongoDB by putting identity outside `metaField`. Which reframed the
question: if the model determines the performance, what is the second datastore
buying? Another credential, another backup story, another thing to reason about.

It is now a native MongoDB time-series collection:

```ts
timeseries: { timeField: "ts", metaField: "meta", granularity: "seconds" },
expireAfterSeconds: 60 * 60 * 24 * 90,
```

`metaField` carries `farmerId` / `fieldId` / `deviceId` — the tag equivalent, and
indexed. Retention is enforced by the database rather than a cron job, and
`$dateTrunc` aggregation downsamples for charts, because raw points at a
two-second cadence are not something to send to a browser.

### Device identity resolution

The ESP32 firmware is frozen and identifies itself with hardware labels —
`farmerId: "fr1", fieldId: "fd1"` — chosen long before fields had generated ids.
The backend stored those verbatim, so **every reading from real hardware landed
in a series that no field pointed at**. The dashboard looked alive only because a
seed script had been backfilling the real field.

`IField.deviceId` already existed for exactly this and was unused. A short-TTL
registry now resolves the reported label to the field that claims the device, and
drops readings nothing claims, so orphan series cannot accumulate again.
`npm run link:device -- <deviceId>` records the mapping.

### Giving a model something it can actually fetch

Attachments are stored as links back to this API — right for a browser holding a
session, wrong for OpenRouter, which has no session and refuses private hosts
outright. A single photograph left a conversation permanently unable to reply:

```
400 Cannot fetch from private/localhost URLs
```

Images now go over as short-lived **signed S3 links**. If signing fails the image
is dropped and the model is told one existed — a reply that cannot see the photo
is worth more than no reply at all.

Field snapshots are rendered into prose before they reach the model. It reasons
about "soil moisture 31%", not about a serialised object.

### Feed paging

The forum is paged by a **cursor on `(createdAt, _id)`**, not by offset. The feed
is ordered newest-first and grows at the head, so an offset shifts under the
reader between requests and duplicates or drops a post. `createdAt` alone is not
unique at second resolution, hence the pair. Each query fetches `limit + 1` rows,
so "is there another page" needs no second round trip.

### Follows as edges

A follow is a row in its own collection with a unique compound index, not an
array on the user. An array of followers is unbounded — a popular expert would
grow a document that every read of that user has to carry, and the 16MB cap is a
real ceiling. The unique index also makes a double-follow structurally impossible
rather than merely checked, which a read-then-write cannot promise under
concurrency.

### Concurrency and failure direction

- **Double AI generation.** A client can legitimately join a session twice — a
  second tab, a reconnect, React re-running an effect. Without a claim, two joins
  both see an empty transcript and both generate, and the farmer gets the same
  answer twice. An in-process `Set` claims the session; a concurrent join waits
  for the broadcast.
- **Review failures fail closed.** If the moderation call errors, the verdict
  stays unset. The post stays visible to its author and invisible to everyone
  else — a model outage says nothing about the post, and must never read as a
  rejection.
- **Soil nulls stay null.** SoilGrids has genuine coverage gaps. Coercing a
  missing pH to `0` would have the advisor confidently discussing pH 0.

### Uploads

Object keys are **generated, never taken from `originalname`** — a client-supplied
name allows `../` traversal, lets one user overwrite another's object by reusing
a filename, and makes keys guessable. SVG is excluded from the allow-list because
it can carry executable script that would run on this origin. Images are
re-encoded to WebP through sharp, with EXIF orientation honoured before metadata
is stripped. The bucket stays private; reads go through a redirect to a signed URL
minted per request, so a stored link keeps working without the signature being
baked into the saved value.

---

## 📦 Modules

| Module | Responsibility |
|---|---|
| `auth` | Sessions, three-stage password reset, demo sign-in |
| `user` | Accounts, roles, expert credentials |
| `fields` | Field CRUD, actuator state, weather, soil, insights, snapshots |
| `sensorData` | MQTT ingest, time-series writes, device registry, aggregation |
| `advisorySession` | Conversations, socket namespace, escalation, context compression |
| `posts` | Forum, AI review gate, cursor paging, search |
| `follow` | Follow graph and public profiles |
| `upload` | S3 uploads, validation, signed reads |
| `public` | Anonymised read surface for the landing page |
| `adminStats` / `expertStats` | Role-specific dashboards |

## 🚀 Running it

```bash
npm install
# configure Mongo URI, JWT secrets, MQTT, AWS and OpenRouter credentials
npm run dev               # http://localhost:5002
```

| Script | Purpose |
|---|---|
| `npm run dev` | Development server with reload |
| `npm run build` / `start:prod` | Compile and run |
| `npm run seed:demo` | Designate the demo accounts |
| `npm run link:device -- <id>` | Point a hardware node at a field |
| `npm run seed:telemetry` | Backfill readings for charts |
| `npm run llm:check` | Verify the model credentials |

## 🧭 Known gaps

Stated rather than hidden, because a reviewer will find them anyway.

- **No automated tests.** The effort went into the correctness of the data model
  first; a Jest + Supertest + `mongodb-memory-server` harness is the next piece.
- **Socket state is in-process.** The generation claim lives in a `Set`, which is
  correct for a single instance and would need Redis behind more than one.
