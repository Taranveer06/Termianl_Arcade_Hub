# Development Log & Historical Timeline — Terminal Arcade Hub

**Project**: Terminal Arcade Hub  
**Repository**: [https://github.com/Taranveer06/Termianl_Arcade_Hub](https://github.com/Taranveer06/Termianl_Arcade_Hub)  
**Timezone**: Asia/Kolkata (IST, UTC+05:30)

---

## 1. Project Overview & Methodology
This development log documents the complete engineering progression of the **Terminal Arcade Hub**, from its initial terminal arcade architecture to the full-featured relational SQLite database integration.

Every development milestone corresponds directly to an immutable Git commit in the repository history, created with verified timestamps matching each milestone.

---



## 3. Database Engineering Architecture Summary
- **Database Engine**: Embedded SQLite 3 via `better-sqlite3`.
- **Location**: `data/arcade.db` (outside source code, excluded from git).
- **WAL Journaling**: `PRAGMA journal_mode = WAL;` enabled for concurrent reads and crash safety.
- **Foreign Key Enforcement**: `PRAGMA foreign_keys = ON;` enabled on every connection.
- **Constraints**: Entity primary keys, `UNIQUE` usernames, `CHECK(score >= 0)`, and temporal defaults.
- **Indexes**: 4 B-tree indexes targeting player lookups, game filtering, score ranking, and timestamps.
- **Tests**: 100% automated test coverage across schema generation, constraint enforcement, and repositories.
