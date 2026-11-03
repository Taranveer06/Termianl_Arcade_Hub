# Entity-Relationship (ER) Diagram — Terminal Arcade Hub

## Relational Entity-Relationship Diagram

```mermaid
erDiagram
    PLAYERS ||--o{ GAME_SESSIONS : "plays"
    GAMES ||--o{ GAME_SESSIONS : "records"

    PLAYERS {
        int player_id PK "AUTOINCREMENT"
        string username UK "UNIQUE NOT NULL"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    GAMES {
        int game_id PK "AUTOINCREMENT"
        string game_name UK "UNIQUE NOT NULL"
        string description
    }

    GAME_SESSIONS {
        int session_id PK "AUTOINCREMENT"
        int player_id FK "REFERENCES players(player_id)"
        int game_id FK "REFERENCES games(game_id)"
        int score "CHECK (score >= 0)"
        int duration_seconds "Gameplay duration"
        datetime played_at "DEFAULT CURRENT_TIMESTAMP"
    }
```

### Relationship Cardinalities
1. **`PLAYERS` to `GAME_SESSIONS` (1 : N)**
   - Mandatory on the session side (`player_id` NOT NULL).
   - Optional on the player side (a newly registered player initially has 0 sessions).
2. **`GAMES` to `GAME_SESSIONS` (1 : N)**
   - Mandatory on the session side (`game_id` NOT NULL).
   - Optional on the game side (a game title can have 0 or more recorded sessions).
