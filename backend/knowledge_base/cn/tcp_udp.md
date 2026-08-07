# Computer Networks: TCP and UDP

## Transport Layer Overview
The Transport Layer (Layer 4 of OSI model) provides end-to-end communication between applications running on different hosts. The two primary protocols are TCP and UDP.

---

## TCP (Transmission Control Protocol)

### Characteristics
- **Connection-oriented**: Must establish a connection before data transfer.
- **Reliable**: Guarantees delivery; handles lost/corrupted/out-of-order packets.
- **Ordered**: Data arrives in the same order it was sent.
- **Flow-controlled**: Prevents sender from overwhelming receiver.
- **Congestion-controlled**: Reduces transmission rate when network is congested.
- **Slower** than UDP due to overhead of reliability mechanisms.

### TCP Three-Way Handshake (Connection Establishment)
```
Client                    Server
  |  --- SYN (seq=x) ---->  |   Step 1: Client sends SYN
  |  <-- SYN-ACK (seq=y,   |   Step 2: Server sends SYN-ACK
  |       ack=x+1) -------  |
  |  --- ACK (ack=y+1) -->  |   Step 3: Client acknowledges
  |        Connected        |
```
- **SYN**: Synchronize sequence numbers.
- **SYN-ACK**: Server acknowledges client's SYN, sends its own SYN.
- **ACK**: Client acknowledges server's SYN.

### TCP Four-Way Handshake (Connection Termination)
```
Client                    Server
  |  --- FIN ------------>  |   Client done sending
  |  <-- ACK -------------  |   Server acknowledges
  |  <-- FIN -------------  |   Server done sending
  |  --- ACK ------------>  |   Client acknowledges
```
**TIME_WAIT state**: Client waits 2× Maximum Segment Lifetime (MSL) before fully closing — ensures final ACK was received.

### TCP Reliability Mechanisms

**Sequence Numbers and Acknowledgements**:
- Every byte of data has a sequence number.
- ACK number = next byte expected.
- **Cumulative ACK**: ACKing byte N means all bytes up to N-1 received.

**Retransmission**:
- Sender starts a timer for each segment. If no ACK received before timeout → retransmit.
- **Fast Retransmit**: If 3 duplicate ACKs received (same ACK number), retransmit immediately without waiting for timeout.

**Flow Control (Sliding Window)**:
- Receiver advertises a **receive window (rwnd)** — how many bytes it can buffer.
- Sender never sends more than min(cwnd, rwnd) unacknowledged bytes.

**Congestion Control**:
- **Slow Start**: Start with small congestion window (cwnd); double it each RTT until threshold.
- **Congestion Avoidance**: Once past threshold, increase cwnd by 1 MSS per RTT (linear growth).
- **TCP Reno**: On 3 duplicate ACKs → halve cwnd (fast recovery). On timeout → reset cwnd to 1.
- **TCP CUBIC** (default in Linux): More aggressive recovery, handles high-bandwidth links better.

---

## UDP (User Datagram Protocol)

### Characteristics
- **Connectionless**: No handshake; data sent immediately.
- **Unreliable**: No delivery guarantee, no ordering.
- **No flow/congestion control**.
- **Faster** and **lower latency** than TCP.
- **No state maintained**: Stateless — great for scalability.

### UDP Use Cases
- **Real-time applications**: Video calls (Zoom, WebRTC), online gaming — occasional packet loss is acceptable; latency is not.
- **DNS**: Small request-response; simpler to retry at application layer.
- **DHCP**: Broadcast-based; connectionless by nature.
- **Streaming**: YouTube/Netflix (now use QUIC/HTTP3, which is UDP-based).
- **SNMP**: Network monitoring.
- **VoIP**: Voice over IP.

---

## TCP vs UDP Comparison

| Feature | TCP | UDP |
|---|---|---|
| Connection | Connection-oriented | Connectionless |
| Reliability | Guaranteed delivery | No guarantee |
| Ordering | In-order delivery | May arrive out of order |
| Error Checking | Checksums + retransmit | Checksums only (optional) |
| Flow Control | Yes | No |
| Congestion Control | Yes | No |
| Speed | Slower (overhead) | Faster |
| Header Size | 20–60 bytes | 8 bytes |
| Use Cases | HTTP, FTP, SMTP, SSH | DNS, VoIP, gaming, video streaming |

---

## Ports
- 16-bit number identifying specific processes/services.
- **Well-known ports (0–1023)**: HTTP=80, HTTPS=443, SSH=22, FTP=21, SMTP=25, DNS=53.
- **Registered ports (1024–49151)**: Registered services.
- **Dynamic/Ephemeral (49152–65535)**: OS-assigned for client connections.

## Sockets
- Socket = IP address + Port number.
- Uniquely identifies an endpoint of communication.
- TCP socket: `(client_IP, client_port, server_IP, server_port)` — uniquely identifies a connection.

## Key Interview Questions
1. Explain the TCP three-way handshake. Why is a three-way handshake needed and not two-way?
2. What happens during TCP connection termination? Why is there a TIME_WAIT state?
3. When would you use UDP over TCP?
4. What is TCP congestion control and what is the difference between slow start and congestion avoidance?
5. What is a socket? How is a TCP connection uniquely identified?
