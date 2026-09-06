**FarmFlow : A Real-Time Decision Support
System for Efficient Crop Environment
Management and Community based
Knowledge Sharing**
==================================================
![FarmFlow Banner 1](https://i.ibb.co.com/LhhFxWFD/github-banner-hardware-farmflow.jpg)
![FarmFlow Banner 2](https://arbora-bucket.s3.us-east-2.amazonaws.com/system+assets/IMAGE+2026-09-05+22%3A26%3A38.jpg)

The API behind FarmFlow: an IoT platform for greenhouse and high-value crop
growers in Bangladesh. ESP32 nodes publish over MQTT, readings land in a MongoDB
time-series collection, and the same data feeds a live dashboard, an AI advisor
and a moderated community forum.

Node.js · TypeScript · Express 5 · MongoDB (time-series) · MQTT · Socket.IO · S3 · OpenRouter

---

## What it does

### Live field telemetry

ESP32 nodes publish temperature, humidity, soil moisture and light over MQTT.
Readings stream to the browser through an authenticated Socket.IO namespace, so
a farmer watching a field sees values move without polling. Actuator commands
(irrigation, shade) travel the same path in reverse.

### Tiered advisory — AI first, human second

Bangladesh runs roughly **one agricultural extension officer per 2,500 farmers**.
A farmer opens a conversation and an LLM answers immediately, reading that
field's actual sensor values, its soil profile and its crop rather than offering
generic advice. When a case needs a person, the thread is handed to a verified
agronomist with its full history — nothing is retyped. Replies stream token by
token over the socket, and the advisor answers in Bangla or English depending on
how it was asked.

### Field snapshots

The feature that makes the advisory useful. A farmer attaches a **point-in-time
capture** of a field — its details, latest reading, soil profile and three-day
forecast — to a conversation or a forum post, and it renders as one card
wherever it appears.

It is stored **by value, not by reference**. An advisory thread read six months
later shows the readings that prompted the question, not today's. A live lookup
would quietly rewrite the question's context and make the expert's answer look
wrong.

### AI-moderated community forum

Every post goes to a vision model before it is published. The verdict is a
**tri-state, and the third state is the absence of the field**: unset means "in
review", `true` means published, `false` means held back with a reason the author
can act on. A boolean defaulting to false could not tell *waiting* from
*rejected*, and those need different words on screen.

Until a post passes it is visible to its author and to an admin, and to nobody
else. Admins can override the verdict.

### Social layer

Farmers and experts follow each other; a post's author links to a public profile
carrying their role, credentials and posts. Experts get their own dashboard —
advisories requested and resolved, farmers helped, review average, credential
states — which is a different question from the admin's platform summary, so it
is a different endpoint rather than the same one filtered.

### Public read surface

An anonymous visitor sees live telemetry on the landing page before signing in:
real readings, no personal data, no field identity, no actuator control.

---

## Engineering notes

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
five-second cadence are not something to send to a browser.

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

### Auth and abuse surface

- Access token in an **httpOnly cookie**, which is what lets the frontend render
  authenticated pages on the server.
- Role is read **from the database on every request**, never trusted from the
  token, so a revoked or changed role takes effect immediately.
- Tokens issued before `passwordChangedAt` are rejected.
- Password reset is three stages with **bcrypt-hashed codes**, a five-attempt
  cap, and a deliberately generic response to `forgot-password` so the endpoint
  cannot be used to discover which addresses are registered.
- **Passwordless demo sign-in** for evaluators: the request carries a role and
  nothing else, and the server resolves which account that means by matching an
  explicit `isDemo` flag — so it cannot be repointed at a real account, and no
  credential exists in the client bundle. Demo accounts refuse password changes,
  since the first visitor to change one would lock out everyone after them.
- Rate limits key on **`ipKeyGenerator`**, not the raw address: one IPv6
  subscriber typically holds a whole /64 and could otherwise rotate addresses to
  lift their own limit.

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

## Modules

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

## Running it

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

## Known gaps

Stated rather than hidden, because a reviewer will find them anyway.

- **No automated tests.** The effort went into the correctness of the data model
  first; a Jest + Supertest + `mongodb-memory-server` harness is the next piece.
- **Moderation has no retry.** A post whose review call fails stays in review
  until it is retried by hand.
- **Socket state is in-process.** The generation claim lives in a `Set`, which is
  correct for a single instance and would need Redis behind more than one.
