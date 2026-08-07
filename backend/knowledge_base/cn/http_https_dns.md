# Computer Networks: HTTP, HTTPS, and DNS

## HTTP (HyperText Transfer Protocol)

### Overview
HTTP is an application-layer protocol for transmitting hypermedia (web pages, APIs). It follows a **request-response** model over TCP.

### HTTP Methods (Verbs)
- **GET**: Retrieve data. Safe (no side effects) and idempotent.
- **POST**: Submit data to create a resource. Not idempotent.
- **PUT**: Replace a resource entirely. Idempotent.
- **PATCH**: Partially update a resource.
- **DELETE**: Remove a resource. Idempotent.
- **HEAD**: Like GET but returns only headers (no body).
- **OPTIONS**: Returns allowed methods for a resource (used in CORS preflight).

### HTTP Status Codes
- **1xx Informational**: 100 Continue, 101 Switching Protocols.
- **2xx Success**: 200 OK, 201 Created, 204 No Content.
- **3xx Redirection**: 301 Moved Permanently, 302 Found, 304 Not Modified.
- **4xx Client Error**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests.
- **5xx Server Error**: 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable.

### HTTP Headers (Important)
- `Content-Type`: Media type of the body (e.g., `application/json`).
- `Authorization`: Credentials (e.g., `Bearer <token>`).
- `Cache-Control`: Caching directives (`no-cache`, `max-age=3600`).
- `CORS Headers`: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`.
- `Cookie` / `Set-Cookie`: Session management.

---

## HTTP Versions

### HTTP/1.1
- **Persistent connections**: One TCP connection can serve multiple requests (keep-alive).
- **Pipelining**: Multiple requests without waiting for responses — but servers must respond in order (**Head-of-Line blocking**).
- Text-based protocol (human-readable).

### HTTP/2
- **Binary protocol**: Frames instead of text — faster parsing.
- **Multiplexing**: Multiple streams over a single TCP connection — no Head-of-Line blocking at HTTP level.
- **Header Compression (HPACK)**: Reduces overhead for repeated headers.
- **Server Push**: Server can proactively send resources the client will need.
- Still suffers from TCP-level Head-of-Line blocking.

### HTTP/3 (QUIC-based)
- Uses **QUIC** (Quick UDP Internet Connections) over **UDP** instead of TCP.
- Eliminates TCP Head-of-Line blocking entirely — each stream is independent.
- Built-in TLS 1.3 — faster connection setup (0-RTT for returning clients).
- Better performance on lossy networks (mobile, Wi-Fi).

---

## HTTPS (HTTP Secure)

### What is HTTPS?
HTTP over **TLS (Transport Layer Security)** — encrypts communication between client and server.

### TLS Handshake (TLS 1.2 — 2 RTT)
```
Client                        Server
  | -- ClientHello ----------->|   (supported TLS versions, cipher suites)
  | <-- ServerHello + Cert ----|   (chosen cipher, server's TLS certificate)
  | -- ClientKeyExchange ----->|   (pre-master secret encrypted with server's public key)
  |    [ Both derive session keys ]
  | -- Finished (encrypted) -->|
  | <-- Finished (encrypted) --|
  |    [ Encrypted data begins ]
```

### TLS 1.3 (1 RTT, faster)
- Removed outdated cipher suites; simpler, more secure.
- **0-RTT resumption**: Returning clients can send data on first message.

### Certificate and PKI
- Server presents a **TLS certificate** signed by a **Certificate Authority (CA)**.
- Client verifies: is the cert signed by a trusted CA? Does the hostname match?
- Certificate contains: Public key, domain name, validity period, CA signature.

### Why HTTPS Matters
- **Confidentiality**: Data encrypted, cannot be read by eavesdroppers (MITM).
- **Integrity**: Data cannot be modified in transit without detection.
- **Authentication**: Server identity verified via certificate.

---

## DNS (Domain Name System)

### What is DNS?
A hierarchical, distributed naming system that maps **domain names** to **IP addresses**. The "phone book of the internet."

### DNS Resolution Process (Iterative)
When you type `www.google.com`:
1. Browser checks its **local cache**.
2. OS checks the **hosts file** and its **resolver cache**.
3. Query sent to **Recursive Resolver** (provided by ISP or public DNS like 8.8.8.8).
4. Resolver asks **Root DNS Server** (.) → directs to TLD nameserver.
5. Resolver asks **TLD DNS Server** (.com) → directs to authoritative nameserver.
6. Resolver asks **Authoritative DNS Server** (google.com) → returns IP address.
7. Resolver returns IP to client and **caches** the result for TTL duration.

### DNS Record Types
| Record | Purpose | Example |
|---|---|---|
| **A** | Maps hostname to IPv4 address | `google.com → 142.250.195.78` |
| **AAAA** | Maps hostname to IPv6 address | `google.com → 2607:f8b0:...` |
| **CNAME** | Canonical name (alias) | `www.example.com → example.com` |
| **MX** | Mail exchange server | `example.com → mail.example.com` |
| **NS** | Nameserver for domain | `example.com → ns1.example.com` |
| **TXT** | Text data (SPF, DKIM, verification) | `"v=spf1 include:..."` |
| **PTR** | Reverse DNS (IP → hostname) | `192.168.1.1 → host.example.com` |
| **SOA** | Start of authority (zone info) | |

### TTL (Time to Live)
Duration DNS record is cached. Low TTL = faster propagation of changes; high TTL = fewer DNS lookups = better performance.

### DHCP (Dynamic Host Configuration Protocol)
Automatically assigns IP addresses to hosts on a network.
- **DORA Process**: Discover → Offer → Request → Acknowledge.
- Uses UDP; server port 67, client port 68.

## Key Interview Questions
1. What is the difference between HTTP/1.1, HTTP/2, and HTTP/3?
2. Explain the TLS handshake. What makes HTTPS secure?
3. Walk me through what happens when you type a URL in the browser and press Enter.
4. What is the difference between a CNAME and an A record?
5. What is the difference between authentication and authorization in the context of HTTP?
