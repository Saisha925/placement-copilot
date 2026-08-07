# DBMS: Keys, Constraints, and ER Modelling

## Keys in Relational Databases

### Super Key
Any set of attributes that **uniquely identifies** a tuple (row) in a relation. Can contain extra, unnecessary attributes.

### Candidate Key
A **minimal super key** — no subset of it is also a super key. A table may have multiple candidate keys.

### Primary Key
The **chosen candidate key** used to uniquely identify tuples. Must be:
- **Unique** — no two rows share the same value.
- **Not NULL** — every row must have a value.

### Alternate Key
Any **candidate key that is not the primary key**.

### Foreign Key
An attribute (or set) in one table that **references the primary key** of another table. Enforces **referential integrity** — the referenced value must exist.
```sql
CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  customer_id INT,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
```

**Referential Actions**:
- `CASCADE`: Automatically propagate DELETE/UPDATE to child rows.
- `SET NULL`: Set FK to NULL when parent is deleted.
- `RESTRICT`: Prevent deletion/update if child rows exist.
- `NO ACTION`: Same as RESTRICT (checked at end of transaction).

### Composite Key
A primary key composed of **two or more columns** — neither column alone is sufficient.

### Surrogate Key
An **artificial key** (e.g., auto-incremented integer) with no business meaning, used as the primary key when no natural key exists.

### Natural Key
A key derived from **real-world data** (e.g., email address, national ID number).

---

## Integrity Constraints

### Entity Integrity
Primary key must be unique and not NULL.

### Referential Integrity
Foreign key values must match an existing primary key value or be NULL.

### Domain Constraint
Each attribute value must be from a valid domain (e.g., age must be positive integer, gender must be 'M' or 'F').

### Check Constraint
User-defined rule on column values:
```sql
ALTER TABLE employees ADD CONSTRAINT chk_salary CHECK (salary >= 0);
```

### NOT NULL Constraint
Column must always have a value.

### UNIQUE Constraint
All values in the column must be distinct (NULLs usually allowed but counted distinctly).

---

## Entity-Relationship (ER) Model

ER modelling is a conceptual design technique to represent the structure of a database.

### Entities
An **entity** is a real-world object (e.g., Student, Course, Employee). Represented as a **rectangle**.

**Entity Types**:
- **Strong Entity**: Has its own primary key (e.g., Student identified by student_id).
- **Weak Entity**: Has no primary key; depends on a strong entity. Uses a **partial key** (discriminator) + owner's key. Represented with double rectangle.

### Attributes
Properties of an entity. Represented as **ovals**.
- **Simple Attribute**: Atomic, indivisible (e.g., age).
- **Composite Attribute**: Made of sub-attributes (e.g., name → first_name + last_name).
- **Derived Attribute**: Computed from other attributes (e.g., age derived from date_of_birth). Dashed oval.
- **Multi-valued Attribute**: Can have multiple values (e.g., phone numbers). Double oval.
- **Key Attribute**: Underlined — uniquely identifies the entity.

### Relationships
Association between entities. Represented as **diamonds**.

**Cardinality Ratios**:
- **1:1** (One-to-One): Each entity in A relates to at most one entity in B (e.g., person ↔ passport).
- **1:N** (One-to-Many): One entity in A relates to many in B (e.g., department → employees).
- **M:N** (Many-to-Many): Many in A relate to many in B (e.g., students ↔ courses). Requires a junction/association table in relational model.

**Participation**:
- **Total Participation** (double line): Every entity must participate in the relationship.
- **Partial Participation** (single line): Some entities may not participate.

### Converting ER to Relational Schema
- Each strong entity → one table; key attribute → primary key.
- Weak entity → table with foreign key referencing strong entity + partial key.
- 1:N relationship → foreign key in the "N" side entity.
- M:N relationship → separate junction table with foreign keys from both entities + relationship attributes.
- Multi-valued attribute → separate table with foreign key.

---

## Stored Procedures and Views

### View
A **virtual table** based on a SELECT query. Simplifies complex queries and provides security by hiding column details.
```sql
CREATE VIEW high_salary_employees AS
SELECT name, dept_id FROM employees WHERE salary > 80000;
```
**Updatable Views**: Can issue DML (INSERT/UPDATE/DELETE) on some views. Views with GROUP BY, DISTINCT, aggregates are typically not updatable.

### Stored Procedure
Precompiled SQL code stored in the database; executed on demand.
```sql
CREATE PROCEDURE get_employees_by_dept(IN dept_id_param INT)
BEGIN
  SELECT * FROM employees WHERE dept_id = dept_id_param;
END;
```
Benefits: reduced network traffic, code reuse, security (execute without seeing SQL).

### Trigger
Code that **automatically executes** in response to INSERT, UPDATE, or DELETE on a table.
```sql
CREATE TRIGGER update_salary_audit
AFTER UPDATE ON employees
FOR EACH ROW
INSERT INTO audit_log VALUES (OLD.emp_id, OLD.salary, NEW.salary, NOW());
```

## Key Interview Questions
1. What is the difference between a primary key and a candidate key?
2. What is referential integrity? What happens with ON DELETE CASCADE?
3. What is the difference between a strong entity and a weak entity in ER modelling?
4. How do you convert a Many-to-Many relationship to a relational schema?
5. What is the difference between a view and a table?
