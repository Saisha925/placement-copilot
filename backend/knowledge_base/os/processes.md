# Operating Systems: Processes

A process is a program in execution. It is the unit of work in a modern time-sharing system.

## Process States
1. **New**: The process is being created.
2. **Ready**: The process is waiting to be assigned to a processor.
3. **Running**: Instructions are being executed.
4. **Waiting (Blocked)**: The process is waiting for some event to occur (e.g., I/O completion).
5. **Terminated**: The process has finished execution.

## Process Control Block (PCB)
Each process is represented in the operating system by a PCB. It contains:
- Process state
- Program counter
- CPU registers
- CPU scheduling information
- Memory-management information
- Accounting information
- I/O status information

## Context Switching
When an interrupt occurs, the system saves the context of the currently running process in its PCB and restores the context of the next process to run from its PCB. This is called a context switch. It is pure overhead because the system does no useful work while switching.
