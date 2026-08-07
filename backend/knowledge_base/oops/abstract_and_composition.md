# OOP: Abstract Classes, Interfaces, and Composition vs Inheritance

## Abstract Classes vs Interfaces

### Abstract Class
- A class that **cannot be instantiated** directly.
- May contain **both abstract methods** (no body, must be overridden) and **concrete methods** (with implementation).
- Can have **instance variables** and **constructors**.
- A class can extend **only one** abstract class (single inheritance in Java/C#).

```python
from abc import ABC, abstractmethod

class Animal(ABC):
    def __init__(self, name):
        self.name = name  # Concrete attribute

    @abstractmethod
    def speak(self):  # Must be implemented by subclasses
        pass

    def breathe(self):  # Concrete method — shared behavior
        return "Inhales oxygen"

class Dog(Animal):
    def speak(self):
        return "Woof"
```

**When to use**: When subclasses share common implementation (code reuse) but also enforce a contract.

### Interface
- A **pure contract** — defines *what* a class must do, not *how*.
- All methods are abstract (no implementation — except default methods in Java 8+).
- No instance variables (only constants).
- A class can **implement multiple interfaces** — solving the multiple inheritance problem.

```python
# Python uses ABC with all abstractmethods to simulate interfaces
class Flyable(ABC):
    @abstractmethod
    def fly(self): ...

class Swimmable(ABC):
    @abstractmethod
    def swim(self): ...

class Duck(Animal, Flyable, Swimmable):
    def speak(self): return "Quack"
    def fly(self): return "Flap wings"
    def swim(self): return "Paddle"
```

### Abstract Class vs Interface — Comparison

| Aspect | Abstract Class | Interface |
|---|---|---|
| Instantiation | Cannot instantiate | Cannot instantiate |
| Methods | Abstract + concrete | All abstract (by default) |
| Variables | Instance variables allowed | Only constants |
| Constructor | Yes | No |
| Inheritance | Single | Multiple |
| Use case | "Is-A" + shared code | Pure contract, multiple inheritance |

---

## Inheritance

### Types of Inheritance
- **Single**: One class inherits from one parent.
- **Multi-level**: A inherits from B, B inherits from C.
- **Multiple**: One class inherits from two or more parents (Python supports, Java does not for classes).
- **Hierarchical**: Multiple classes inherit from one parent.
- **Hybrid**: Combination of the above.

### Diamond Problem
Occurs in multiple inheritance: if class D inherits from B and C, both of which inherit from A, which version of A's methods does D get?

```
    A
   / \
  B   C
   \ /
    D
```

**Python resolution**: Method Resolution Order (MRO) using C3 linearization. Use `super()` and check `ClassName.__mro__`.

### When to Use Inheritance
- Clear "**is-a**" relationship: Dog **is a** Animal.
- Subclass is a specialization of the parent.
- Want to reuse and extend parent's code.

---

## Composition

**"Favor composition over inheritance"** — a key OOP principle.

### What is Composition?
A class contains instances of other classes as **components**, rather than inheriting from them.

```python
class Engine:
    def start(self): return "Engine running"
    def stop(self): return "Engine stopped"

class Car:
    def __init__(self):
        self.engine = Engine()  # Car HAS-A Engine (composition)

    def start(self):
        return self.engine.start()
```

### Composition vs Inheritance

| Aspect | Inheritance | Composition |
|---|---|---|
| Relationship | IS-A | HAS-A |
| Coupling | Tight (changes in parent affect child) | Loose (components are independent) |
| Flexibility | Less flexible — hierarchy is fixed | More flexible — swap components at runtime |
| Code reuse | High — inherits everything | High — delegates to components |
| Testing | Harder — must test parent too | Easier — test components independently |

### Why "Favor Composition"?
- **Inheritance breaks encapsulation**: Subclass depends on parent's implementation details.
- **Composition is more flexible**: You can change behaviour at runtime by swapping components.
- **Avoids deep inheritance hierarchies**: Deep trees become hard to understand and maintain.

**Example — Duck Typing with Composition**:
Instead of `ElectricCar extends Car`, use `Car(engine=ElectricEngine())`. You can swap engine type without changing the Car class.

---

## Virtual Functions and Polymorphism (C++ perspective, important for interviews)

### Virtual Function
A function declared with `virtual` in a base class, allowing it to be **overridden** by derived classes, with the correct version called at runtime.

```cpp
class Animal {
public:
    virtual void speak() { cout << "..."; }
};

class Dog : public Animal {
public:
    void speak() override { cout << "Woof"; }
};

Animal* a = new Dog();
a->speak();  // "Woof" — runtime polymorphism via vtable
```

### vtable (Virtual Table)
A compiler-generated table of function pointers for classes with virtual methods. Each object has a **vptr** pointing to its class's vtable. At runtime, the correct function is looked up in the vtable — this is **dynamic dispatch**.

### Pure Virtual Function
```cpp
virtual void speak() = 0;  // Makes the class abstract
```

## Key Interview Questions
1. What is the difference between an abstract class and an interface?
2. When would you choose inheritance over composition?
3. What is the diamond problem and how does Python resolve it?
4. Explain what a vtable is and how it enables runtime polymorphism.
5. Why is "favor composition over inheritance" considered a best practice?
