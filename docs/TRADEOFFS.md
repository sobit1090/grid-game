# CosmoGrid Technology Tradeoffs

This document details the architectural decisions and tradeoffs made when selecting the technology stack for CosmoGrid.

---

## 1. Relational PostgreSQL vs Document MongoDB

### Selection: PostgreSQL
We chose PostgreSQL to serve as the application's relational data store.

### Comparison
| Feature | PostgreSQL (Chosen) | MongoDB |
| :--- | :--- | :--- |
| **Data Integrity** | Strict ACID guarantees, foreign keys, and cascading deletes. | Base schema-less layout. Risk of orphan database records. |
| **Concurrency Lock** | Atomic updates with optimistic `ownerId IS NULL` matches. | Atomic operators (`$set`), but harder to enforce complex relations. |
| **Index B-Trees** | Fast multi-column unique indexing (`gameId, x, y`). | Supports indexing, but less optimized for relational joins. |

### Conclusion
PostgreSQL's transactional integrity is essential for preventing coordinate capture conflicts, making it the superior choice over MongoDB for a grid-based claiming game.

---

## 2. Socket.IO vs Raw HTML5 WebSockets

### Selection: Socket.IO
We wrapped our real-time network interactions in the Socket.IO framework.

### Comparison
| Feature | Socket.IO (Chosen) | Raw WebSockets |
| :--- | :--- | :--- |
| **Reconnections** | Auto-retry configuration with backoff algorithms. | Manual client-side reconnection loop coding required. |
| **Handshake Polling** | Starts with HTTP Polling to bypass strict proxies. | Instant TCP connection request; can fail behind some firewalls. |
| **Room Abstractions** | Virtual namespaces built-in (`socket.join('room')`). | Require building custom channel dispatch logic. |

### Conclusion
Socket.IO reduces development overhead for connection management and room isolation, making it worth the minor performance overhead compared to raw WebSockets.

---

## 3. Next.js App Router vs Vite SPA Client

### Selection: Next.js 15
Next.js serves as our client layout and dashboard API route manager.

### Comparison
| Feature | Next.js (Chosen) | Vite SPA |
| :--- | :--- | :--- |
| **Rendering** | Server components send raw HTML, saving client bundle sizes. | Pure Client-Side Rendering (CSR). High Initial Page Load (JS bloat). |
| **Routing** | File-system App Router with automatic route splitting. | Requires client routing setup (React Router, etc.). |
| **Backend Integration** | Easy Next.js Route Handlers for HTTP queries. | Requires separate endpoints configured on a backend server. |

### Conclusion
Next.js provides a production-ready React environment with server rendering optimizations, making it a better fit for a complete product than a bare Vite SPA.

---

## 4. Prisma ORM vs Raw SQL Queries

### Selection: Prisma
Prisma ORM handles PostgreSQL mapping operations.

### Comparison
| Feature | Prisma (Chosen) | Raw SQL Query Builder |
| :--- | :--- | :--- |
| **Type Safety** | Models auto-generate Typescript declarations. | Manual interface definitions mapping columns needed. |
| **Migrations** | Declarative schema mapping via `prisma migrate`. | Requires writing manual SQL scripts to create/modify tables. |
| **Performance** | Minor abstraction overhead, mitigated by using raw query escapes for hot paths. | Maximum execution speed, but prone to syntax errors. |

### Conclusion
Prisma balances developer productivity with type safety. For the capture performance hot path, we bypass the ORM layer using Prisma's raw SQL template tagging (`prisma.$executeRaw`).
