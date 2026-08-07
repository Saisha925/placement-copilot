# OOP: SOLID Principles

SOLID is a set of five design principles that help create software that is easy to maintain, extend, and understand. Coined by Robert C. Martin (Uncle Bob).

---

## S — Single Responsibility Principle (SRP)
**"A class should have only one reason to change."**

Each class should do one thing and do it well. If a class handles multiple responsibilities, changing one responsibility may break others.

**Violation:**
```python
class UserManager:
    def create_user(self, name): ...
    def send_welcome_email(self, user): ...   # Email is a separate concern
    def save_to_database(self, user): ...      # Persistence is a separate concern
```

**Correct:**
```python
class UserCreator:
    def create(self, name): ...

class EmailService:
    def send_welcome(self, user): ...

class UserRepository:
    def save(self, user): ...
```

---

## O — Open/Closed Principle (OCP)
**"Software entities should be open for extension but closed for modification."**

You should be able to add new functionality without changing existing code. Achieved through **abstraction** and **polymorphism**.

**Violation (adding a new shape requires modifying existing code):**
```python
def area(shape):
    if shape.type == "circle": return math.pi * shape.r**2
    if shape.type == "square": return shape.side**2
    # Must modify this function to add new shapes!
```

**Correct (extend by adding new classes):**
```python
class Shape(ABC):
    @abstractmethod
    def area(self): ...

class Circle(Shape):
    def area(self): return math.pi * self.r**2

class Square(Shape):
    def area(self): return self.side**2
```

---

## L — Liskov Substitution Principle (LSP)
**"Objects of a subclass should be substitutable for objects of the superclass without breaking the program."**

If class B is a subclass of class A, you should be able to use B wherever A is expected.

**Classic Violation (Square-Rectangle problem):**
```python
class Rectangle:
    def set_width(self, w): self.width = w
    def set_height(self, h): self.height = h
    def area(self): return self.width * self.height

class Square(Rectangle):
    def set_width(self, w): self.width = self.height = w  # Breaks rectangle behavior
    def set_height(self, h): self.width = self.height = h
```
A function expecting a Rectangle that sets width and height independently breaks with a Square. They should not share this inheritance hierarchy.

---

## I — Interface Segregation Principle (ISP)
**"Clients should not be forced to depend on methods they do not use."**

Prefer many small, specific interfaces over one large general-purpose interface.

**Violation (fat interface):**
```python
class Worker(ABC):
    @abstractmethod
    def work(self): ...
    @abstractmethod
    def eat(self): ...   # Robots don't eat!
    @abstractmethod
    def sleep(self): ... # Robots don't sleep!
```

**Correct:**
```python
class Workable(ABC):
    @abstractmethod
    def work(self): ...

class Eatable(ABC):
    @abstractmethod
    def eat(self): ...

class HumanWorker(Workable, Eatable):
    def work(self): ...
    def eat(self): ...

class Robot(Workable):
    def work(self): ...
```

---

## D — Dependency Inversion Principle (DIP)
**"High-level modules should not depend on low-level modules. Both should depend on abstractions."**

Code to interfaces (abstractions), not concrete implementations.

**Violation (high-level class directly depends on low-level class):**
```python
class EmailNotifier:
    def send(self, message): ...

class OrderService:
    def __init__(self):
        self.notifier = EmailNotifier()  # Tightly coupled!
```

**Correct (inject dependency through abstraction):**
```python
class Notifier(ABC):
    @abstractmethod
    def send(self, message): ...

class EmailNotifier(Notifier):
    def send(self, message): ...

class SMSNotifier(Notifier):
    def send(self, message): ...

class OrderService:
    def __init__(self, notifier: Notifier):  # Depends on abstraction
        self.notifier = notifier
```
Now you can swap `EmailNotifier` for `SMSNotifier` without changing `OrderService` — this is **Dependency Injection**.

---

## Benefits of SOLID
- **Maintainability**: Each class has a clear, focused purpose.
- **Extensibility**: New features added without breaking existing code.
- **Testability**: Small, decoupled classes are easier to unit test.
- **Readability**: Easier for teams to understand and navigate code.

## Key Interview Questions
1. Explain the Single Responsibility Principle with a real-world example.
2. How does the Open/Closed Principle help prevent regression bugs?
3. What is the Liskov Substitution Principle? Explain the Square-Rectangle problem.
4. What is the difference between the Interface Segregation and Dependency Inversion principles?
5. How does Dependency Injection relate to the Dependency Inversion Principle?
