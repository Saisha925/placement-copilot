# Database Normalization

Normalization is the process of organizing data in a database to reduce redundancy and improve data integrity. It involves dividing large tables into smaller, less redundant tables and defining relationships between them.

## 1NF (First Normal Form)
A table is in 1NF if it contains no repeating groups or arrays. Every column must hold atomic (indivisible) values, and each record must be unique.

## 2NF (Second Normal Form)
A table is in 2NF if it is in 1NF and all non-key attributes are fully functionally dependent on the primary key. This means no partial dependency (where an attribute depends on only part of a composite primary key).

## 3NF (Third Normal Form)
A table is in 3NF if it is in 2NF and has no transitive dependencies. A transitive dependency occurs when a non-key attribute depends on another non-key attribute. In 3NF, every non-key attribute must depend directly on the primary key.

## BCNF (Boyce-Codd Normal Form)
BCNF is a stricter version of 3NF. A table is in BCNF if, for every non-trivial functional dependency X -> Y, X is a superkey. This handles cases where 3NF fails due to multiple overlapping candidate keys.
