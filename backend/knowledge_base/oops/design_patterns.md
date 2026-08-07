# OOP: Design Patterns

Design patterns are reusable solutions to commonly occurring problems in software design. They are not code — they are blueprints. Divided into three categories by the Gang of Four (GoF).

---

## Creational Patterns
Deal with object creation mechanisms.

### 1. Singleton
**Intent**: Ensure a class has only **one instance** and provide a global access point to it.

```python
class Singleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

# Usage
s1 = Singleton()
s2 = Singleton()
assert s1 is s2  # True — same instance
```

**Use cases**: Database connection pool, Configuration manager, Logger, Thread pool.
**Problem**: Makes unit testing harder (global state). Thread safety needs explicit handling.

### 2. Factory Method
**Intent**: Define an interface for creating an object, but let subclasses decide which class to instantiate.

```python
class NotificationFactory:
    @staticmethod
    def create(type_: str):
        if type_ == "email": return EmailNotification()
        if type_ == "sms": return SMSNotification()
        if type_ == "push": return PushNotification()
        raise ValueError("Unknown type")
```

**Use cases**: When you don't know at design time what class you need to instantiate.

### 3. Abstract Factory
**Intent**: Create families of related objects without specifying their concrete classes.
Like Factory Method but at a higher level — creates a set of related factories.

**Use cases**: UI toolkit (Windows vs Mac buttons, scrollbars), Database drivers.

### 4. Builder
**Intent**: Construct complex objects step by step. Separate construction from representation.

```python
class QueryBuilder:
    def __init__(self): self._query = {}

    def table(self, name):
        self._query["table"] = name
        return self  # Method chaining

    def where(self, condition):
        self._query["where"] = condition
        return self

    def limit(self, n):
        self._query["limit"] = n
        return self

    def build(self):
        return self._query

# Fluent interface
query = QueryBuilder().table("users").where("age > 18").limit(10).build()
```

**Use cases**: SQL query builders, HTTP request builders, complex object configuration.

### 5. Prototype
**Intent**: Create new objects by copying (cloning) an existing object.

**Use cases**: When object creation is expensive (deep copies). Game character creation.

---

## Structural Patterns
Deal with object composition and structure.

### 1. Adapter
**Intent**: Convert the interface of a class into another interface clients expect. Makes incompatible interfaces work together.

```python
class OldPaymentSystem:
    def old_pay(self, amount_cents): ...

class PaymentAdapter:
    def __init__(self, old_system):
        self.old_system = old_system

    def pay(self, amount_rupees):  # New interface
        self.old_system.old_pay(amount_rupees * 100)
```

**Use cases**: Integrating third-party libraries, legacy system integration.

### 2. Decorator
**Intent**: Add behavior to objects dynamically without modifying the original class. Wraps an object and adds functionality.

```python
class Logger:
    def __init__(self, service):
        self.service = service

    def process(self, request):
        print(f"Request: {request}")
        result = self.service.process(request)
        print(f"Response: {result}")
        return result
```

**Use cases**: Adding logging, caching, authentication, rate limiting to services.
**Python**: `@decorator` syntax is built on this pattern.

### 3. Facade
**Intent**: Provide a simplified interface to a complex subsystem.

```python
class HomeTheaterFacade:
    def watch_movie(self):
        self.amplifier.on()
        self.projector.on()
        self.dvd_player.play()
        self.lights.dim()
```

**Use cases**: APIs that hide complex internal systems, SDK wrappers.

### 4. Proxy
**Intent**: Provide a surrogate or placeholder for another object to control access to it.

**Types**:
- **Virtual Proxy**: Lazy initialization (load heavy resource only when needed).
- **Protection Proxy**: Access control.
- **Remote Proxy**: Represents object in a different address space.
- **Caching Proxy**: Cache results of expensive operations.

---

## Behavioral Patterns
Deal with communication and responsibility between objects.

### 1. Observer (Pub-Sub)
**Intent**: Define a one-to-many dependency — when one object changes state, all dependents are notified automatically.

```python
class EventEmitter:
    def __init__(self): self._listeners = {}

    def on(self, event, callback):
        self._listeners.setdefault(event, []).append(callback)

    def emit(self, event, data):
        for cb in self._listeners.get(event, []):
            cb(data)
```

**Use cases**: Event systems, UI state management (React's useEffect), MVC model change notifications.

### 2. Strategy
**Intent**: Define a family of algorithms, encapsulate each, and make them interchangeable.

```python
class Sorter:
    def __init__(self, strategy):
        self.strategy = strategy  # QuickSort, MergeSort, etc.

    def sort(self, data):
        return self.strategy.sort(data)
```

**Use cases**: Sorting algorithms, payment methods, compression algorithms.

### 3. Iterator
**Intent**: Provide a way to access elements of a collection sequentially without exposing its underlying representation.

Python's `__iter__` and `__next__` implement this pattern natively.

### 4. Command
**Intent**: Encapsulate a request as an object — enabling undo/redo, queuing, logging.

```python
class DeleteUserCommand:
    def execute(self): db.delete(self.user_id)
    def undo(self): db.restore(self.user_id)
```

**Use cases**: Undo/redo functionality, transaction management, job queues.

---

## Key Interview Questions
1. What is the Singleton pattern? What are its drawbacks?
2. What is the difference between Factory Method and Abstract Factory?
3. When would you use the Decorator pattern over inheritance?
4. Explain the Observer pattern. How is it used in event-driven systems?
5. What is the difference between the Adapter and Facade patterns?
