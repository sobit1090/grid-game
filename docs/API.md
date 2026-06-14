# CosmoGrid API Specification

This document details the REST HTTP API endpoints and real-time Socket.IO event payloads.

---

## 1. REST HTTP API Endpoints

### Create Lobby
Create a new game lobby and database record.
- **URL**: `/api/lobby/create`
- **Method**: `POST`
- **Response** (`201 Created`):
  ```json
  {
    "id": "c1f7b99c-e350-48b0-a3df-2ebf68e92211",
    "code": "A7K9P",
    "status": "LOBBY",
    "gameId": null,
    "players": [],
    "cells": {},
    "winnerUsername": null,
    "leaderboard": [],
    "onlineCount": 0
  }
  ```

---

### Join Lobby Check
Verify lobby status before establishing WebSocket handshakes.
- **URL**: `/api/lobby/join`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "code": "A7K9P",
    "username": "AstroCoder",
    "color": "#00f0ff"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "id": "c1f7b99c-e350-48b0-a3df-2ebf68e92211",
    "code": "A7K9P",
    "status": "LOBBY",
    "gameId": null,
    "players": [
      {
        "id": "AstroCoder",
        "username": "AstroCoder",
        "color": "#00f0ff",
        "isReady": false
      }
    ],
    "cells": {},
    "winnerUsername": null,
    "leaderboard": [],
    "onlineCount": 1
  }
  ```

---

### Get Global Leaderboard
Fetch the all-time top players sorted by wins.
- **URL**: `/api/leaderboard`
- **Method**: `GET`
- **Response** (`200 OK`):
  ```json
  [
    {
      "username": "Alice",
      "color": "#00f0ff",
      "totalGames": 42,
      "wins": 28
    },
    {
      "username": "Bob",
      "color": "#ff007f",
      "totalGames": 35,
      "wins": 15
    }
  ]
  ```

---

### Get Player Profile
Retrieve historical player metrics and record volumes.
- **URL**: `/api/profile/:id`
- **Method**: `GET`
- **Response** (`200 OK`):
  ```json
  {
    "username": "AstroCoder",
    "color": "#00f0ff",
    "totalGames": 12,
    "wins": 5,
    "totalCaptures": 450,
    "createdAt": "2026-06-14T12:00:00.000Z"
  }
  ```

---

## 2. Real-Time Socket.IO Events

### Client-to-Server Events

#### Join Game
Join a player session and bind the current socket ID to the lobby.
- **Event Name**: `join_game`
- **Payload**:
  ```json
  {
    "code": "A7K9P",
    "username": "AstroCoder",
    "color": "#00f0ff"
  }
  ```

#### Capture Cell
Attempt to capture a grid coordinate.
- **Event Name**: `capture_cell`
- **Payload**:
  ```json
  {
    "code": "A7K9P",
    "username": "AstroCoder",
    "cellIndex": 125
  }
  ```

#### Player Ready / Start Match
Submit vote to restart or trigger match launch.
- **Event Name**: `player_ready`
- **Payload**:
  ```json
  {
    "code": "A7K9P",
    "username": "AstroCoder"
  }
  ```

---

### Server-to-Client Events

#### Cell Updated
Broadcasts a successful coordinate capture.
- **Event Name**: `cell_updated`
- **Payload**:
  ```json
  {
    "cellIndex": 125,
    "x": 4,
    "y": 5,
    "ownerId": "AstroCoder",
    "color": "#00f0ff"
  }
  ```

#### Leaderboard Updated
Real-time lobby scores standings update.
- **Event Name**: `leaderboard_updated`
- **Payload**:
  ```json
  [
    {
      "username": "AstroCoder",
      "color": "#00f0ff",
      "cellsCount": 1,
      "percentage": 0.1
    }
  ]
  ```

#### Game Over
Emitted when all 900 board tiles are claimed.
- **Event Name**: `game_over`
- **Payload**:
  ```json
  {
    "winnerUsername": "AstroCoder",
    "leaderboard": [
      {
        "username": "AstroCoder",
        "color": "#00f0ff",
        "cellsCount": 480,
        "percentage": 53.3
      }
    ]
  }
  ```

#### Lobby Updated / Restart
Emitted upon join, restart, or status reset.
- **Event Name**: `lobby_updated` / `game_restart`
- **Payload**: Full serialized lobby configuration.
