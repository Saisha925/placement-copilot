# Computer Networks: IP Addressing, Subnetting, and Routing

## IP Addressing

### IPv4
- 32-bit address, written as 4 octets in decimal: `192.168.1.1`
- Total possible addresses: 2³² = ~4.3 billion.

### IPv4 Address Classes (Classful — historical)
| Class | Range | Default Subnet Mask | Hosts per Network |
|---|---|---|---|
| A | 1.0.0.0 – 126.255.255.255 | 255.0.0.0 (/8) | ~16 million |
| B | 128.0.0.0 – 191.255.255.255 | 255.255.0.0 (/16) | ~65,000 |
| C | 192.0.0.0 – 223.255.255.255 | 255.255.255.0 (/24) | 254 |
| D | 224–239 | Multicast | — |
| E | 240–255 | Reserved/Experimental | — |

### Special Addresses
- `127.0.0.1` — Loopback (localhost).
- `0.0.0.0` — All addresses / default route.
- `255.255.255.255` — Limited broadcast.
- **Private ranges** (RFC 1918 — not routable on internet):
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`

### IPv6
- 128-bit address, written in hexadecimal groups: `2001:0db8:85a3::8a2e:0370:7334`
- Total: 2¹²⁸ — effectively unlimited.
- Features: No NAT needed, built-in IPSec, simplified header, better routing.

---

## Subnetting and CIDR

### Subnet Mask
Defines which part of the IP address is the **network** portion and which is the **host** portion.
- `255.255.255.0` = first 24 bits are network, last 8 bits are hosts.
- **CIDR notation**: `/24` means 24 bits for network.

### CIDR (Classless Inter-Domain Routing)
Replaces classful addressing with flexible prefix lengths.
- `192.168.1.0/24` — 2⁸ = 256 addresses, 254 usable hosts (subtract network + broadcast).
- `192.168.1.0/25` — 2⁷ = 128 addresses, 126 usable.

### Subnetting Calculation Example
Given `192.168.1.0/26`:
- Network bits: 26, Host bits: 32–26 = 6.
- Total addresses: 2⁶ = 64.
- Usable hosts: 64 - 2 = 62.
- Network address: `192.168.1.0` (all host bits = 0).
- Broadcast address: `192.168.1.63` (all host bits = 1).
- Usable range: `192.168.1.1` to `192.168.1.62`.

### NAT (Network Address Translation)
Allows multiple devices on a private network to share a single public IP.
- **SNAT**: Changes source IP (outgoing traffic from private → public).
- **DNAT**: Changes destination IP (port forwarding, incoming to private).
- Implemented in home routers and cloud NAT gateways.

---

## Routing

### How Routing Works
Routers forward packets based on the **destination IP** and their **routing table**.
- Each routing table entry: Destination network, Next hop, Interface, Metric (cost).
- **Longest Prefix Match**: Most specific (longest) matching subnet wins.

### Static vs Dynamic Routing
- **Static**: Admin manually configures routes. Simple, predictable but doesn't adapt to failures.
- **Dynamic**: Routers automatically learn routes using routing protocols. Adapts to topology changes.

### Routing Protocols

**Interior Gateway Protocols (IGP)** — within an Autonomous System (AS):

**1. RIP (Routing Information Protocol)**
- Distance vector protocol.
- Metric: **Hop count** (max 15 — any route with 16+ hops is unreachable).
- Sends full routing table to neighbors every 30 seconds.
- Simple but slow convergence; doesn't consider bandwidth.

**2. OSPF (Open Shortest Path First)**
- Link state protocol.
- Metric: **Cost** (based on bandwidth — lower is better).
- Each router builds a **complete map (LSDB)** of the network topology using LSAs (Link State Advertisements).
- Uses **Dijkstra's algorithm** to compute shortest paths.
- Fast convergence; scalable with areas.
- Most commonly used in enterprise networks.

**3. EIGRP (Enhanced Interior Gateway Routing Protocol)**
- Advanced distance vector (Cisco proprietary).
- Metric: Composite of bandwidth and delay.
- Uses DUAL algorithm — fast, loop-free convergence.

**Exterior Gateway Protocols (EGP)** — between Autonomous Systems:

**4. BGP (Border Gateway Protocol)**
- The routing protocol of the **internet** — connects different AS's (ISPs, cloud providers, etc.).
- Path vector protocol — tracks which AS's a route traverses.
- Policy-based routing: operators control which paths are preferred.
- Metric: AS path length + policy attributes.

### Distance Vector vs Link State

| Aspect | Distance Vector (RIP) | Link State (OSPF) |
|---|---|---|
| Information shared | Distance to each destination | Full network topology (LSAs) |
| Algorithm | Bellman-Ford | Dijkstra |
| Convergence | Slow (count-to-infinity problem) | Fast |
| Scalability | Poor | Good (hierarchical areas) |
| Memory/CPU | Low | Higher |

### ARP (Address Resolution Protocol)
Resolves an **IP address to a MAC address** on a local network.
- Host broadcasts: "Who has IP 192.168.1.5? Tell 192.168.1.1"
- Target replies: "192.168.1.5 is at MAC 00:1A:2B:3C:4D:5E"
- Result cached in ARP table.
- **Gratuitous ARP**: Host announces its own IP-MAC mapping (used when IP changes, or for detecting IP conflicts).

## Key Interview Questions
1. What is subnetting and why is it used?
2. Given an IP address and subnet mask, how do you find the network address, broadcast address, and number of usable hosts?
3. What is the difference between distance vector and link state routing protocols?
4. What is BGP and why is it called the protocol that "runs the internet"?
5. What is ARP and what is ARP poisoning?
