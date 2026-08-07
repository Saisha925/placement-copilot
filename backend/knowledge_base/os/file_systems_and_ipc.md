# Operating Systems: File Systems and Inter-Process Communication

## File Systems

### File Concept
A file is a named collection of related information stored on secondary storage. The OS maps the logical view (files, directories) onto physical storage devices.

### File Attributes
Name, identifier, type, location, size, protection, timestamps (created, modified, accessed).

### File Operations
Create, Read, Write, Seek (reposition), Delete, Truncate.
- **Open File Table**: OS maintains a table of currently open files. Each entry holds file pointer, access rights, and count.

### File Types
- Regular files (text, binary)
- Directory files
- Special files (device files, pipes, sockets)

### Access Methods
- **Sequential Access**: Read/write in order from beginning. Simplest.
- **Direct (Random) Access**: Jump to any block directly. Requires relative block number.
- **Indexed Access**: Index table maps keys to block locations.

### Directory Structure
- **Single-Level**: One directory for all users. Name collision problems.
- **Two-Level**: Separate directory per user.
- **Tree-Structured**: Hierarchical directories with paths. Most common.
- **Acyclic Graph**: Directories may share subdirectories/files (symbolic links, hard links).
- **General Graph**: Allows cycles — requires garbage collection to avoid dangling links.

### File Allocation Methods
How disk blocks are allocated to files:

**1. Contiguous Allocation**
- File occupies consecutive blocks on disk.
- Fast sequential and direct access. Simple.
- Suffers from external fragmentation and file growth difficulty.

**2. Linked Allocation**
- Each block contains a pointer to the next block; last block contains null pointer.
- No external fragmentation. Files can grow dynamically.
- Slow direct access (must traverse from beginning). Pointer overhead per block.
- **FAT (File Allocation Table)**: Store all pointers in a table in memory — fast random access.

**3. Indexed Allocation**
- One index block per file holds pointers to all data blocks.
- Fast direct access, no external fragmentation.
- Small files waste index block space. Large files may need multi-level indices.
- **Unix i-nodes**: Combination of direct, single-indirect, double-indirect, triple-indirect block pointers.

### Free Space Management
- **Bit Map (Bit Vector)**: One bit per block (0 = free, 1 = used). Simple; easy to find contiguous blocks. Requires whole bit map in memory.
- **Linked List**: Link all free blocks together. Poor performance (traversal needed).
- **Grouping**: First free block stores addresses of N free blocks.
- **Counting**: Stores first free block + count of N consecutive free blocks following it.

### Disk Scheduling Algorithms
- **FCFS**: Serve in arrival order. Fair but poor performance.
- **SSTF (Shortest Seek Time First)**: Move to closest request. May cause starvation.
- **SCAN (Elevator)**: Move in one direction servicing all requests, then reverse.
- **C-SCAN (Circular SCAN)**: Only service in one direction; jump to beginning and repeat.

---

## Inter-Process Communication (IPC)

Processes may need to cooperate — share data or communicate results. IPC provides mechanisms for this.

### Two Fundamental Models

**1. Shared Memory**
- Processes establish a region of shared memory.
- Communication is controlled by the processes, not the OS.
- Very fast — data not copied through kernel.
- Requires explicit synchronization (semaphores, mutexes) to avoid race conditions.
- Example: POSIX shared memory (`shmget`, `shmat`).

**2. Message Passing**
- Processes communicate by sending/receiving messages.
- No shared memory needed — OS mediates communication (data passes through kernel).
- Easier to use in distributed systems.
- Slower than shared memory due to system call overhead.

### Message Passing Variations
- **Direct Communication**: Processes name each other explicitly — `send(P, msg)` / `receive(Q, msg)`.
- **Indirect Communication**: Messages sent to/received from mailboxes (ports) — `send(A, msg)` to mailbox A.
- **Synchronous (Blocking)**: Sender blocks until receiver gets message; receiver blocks until message arrives.
- **Asynchronous (Non-Blocking)**: Sender continues after sending; receiver checks if message available.
- **Buffering**: Zero-capacity (synchronous), bounded, or unbounded buffer.

### IPC Mechanisms in Practice

**Pipes**:
- Unidirectional byte stream between related processes (parent-child).
- **Anonymous Pipes**: `pipe()` syscall; temporary, no name in filesystem.
- **Named Pipes (FIFOs)**: Have a name in filesystem; allow unrelated processes to communicate.

**Sockets**:
- Endpoint of communication; used for network communication (TCP/IP, UDP) or local (Unix domain sockets).
- Enable IPC between processes on different machines.

**Signals**:
- Software interrupts notifying a process of an event (SIGKILL, SIGTERM, SIGCHLD).
- Limited data transmission; used for notifications.

**Message Queues**:
- Messages stored in queue until receiver reads them. Persistent, supports multiple senders/receivers.

**Semaphores**:
- Primarily for synchronization; can signal events between processes.

## Key Interview Questions
1. What is the difference between contiguous and indexed file allocation?
2. What is an i-node in Unix file systems?
3. What are the two fundamental models of IPC and when would you use each?
4. What is the difference between a pipe and a socket?
5. How does the SCAN disk scheduling algorithm work?
