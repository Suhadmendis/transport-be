# Backend Specification — Transport Fleet Management API

This document is the complete contract between the React Native mobile app and the PHP backend. Build the backend to satisfy every endpoint, JSON shape, and validation rule described here. Do not deviate from field names or response structures — the mobile app parses these shapes directly.

---

## Overview

The mobile app manages four master-file entities: **Drivers**, **Vehicles**, **Cleaners**, and **Items**. The backend exposes a JSON REST API for full CRUD on all four entities. There is no user-facing web interface — this is a pure API backend.

**Language:** PHP  
**Database:** MySQL 8

---

## Connecting the Mobile App

Once the backend is deployed, open `src/api/client.ts` in the mobile app and set:

```ts
const BASE_URL = 'https://your-api-domain.com/api';
```

Then in each entity API file (`src/api/driversApi.ts`, etc.), uncomment the `apiClient` lines and delete the local mock store. No other files need to change.

---

## CORS

The mobile app may call the API from any IP (Expo Go, physical device, emulator). Every response must include these headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Accept
```

Also handle `OPTIONS` preflight requests — return `200` with those headers and an empty body.

---

## Standard Response Envelopes

All responses are JSON. Set the `Content-Type: application/json` header on every response.

### List response

```json
{
  "data": [ ...array of entity objects... ],
  "total": 20
}
```

### Single-entity response

```json
{
  "data": { ...entity object... }
}
```

### Delete success response

```json
{ "message": "Driver removed successfully" }
```

### Error response

```json
{
  "error": "Short error type",
  "message": "Human-readable explanation"
}
```

### HTTP status codes

| Situation | Code |
|-----------|------|
| Successful GET / DELETE | 200 |
| Successful POST (created) | 201 |
| Successful PUT (updated) | 200 |
| Validation failed | 422 |
| Record not found | 404 |
| Server error | 500 |

---

## Database Schema

Use snake_case column names in the database. When building the JSON response, convert them to camelCase (see Field Name Mapping section below).

### `drivers`

```sql
CREATE TABLE drivers (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ref             VARCHAR(20)  NOT NULL UNIQUE,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20)  NOT NULL,
  license_number  VARCHAR(50)  NOT NULL,
  status          ENUM('active','inactive','on_leave') NOT NULL DEFAULT 'active',
  date_of_birth   DATE         NOT NULL,
  joining_date    DATE         NOT NULL,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `vehicles`

```sql
CREATE TABLE vehicles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ref           VARCHAR(20)  NOT NULL UNIQUE,
  plate_number  VARCHAR(20)  NOT NULL UNIQUE,
  make          VARCHAR(50)  NOT NULL,
  model         VARCHAR(50)  NOT NULL,
  type          ENUM('lorry','bowser','tipper','truck','van','bus') NOT NULL,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  last_location VARCHAR(100) NOT NULL DEFAULT 'Depot',
  mileage       INT UNSIGNED NOT NULL DEFAULT 0,
  year          SMALLINT UNSIGNED NOT NULL,
  capacity      INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `cleaners`

```sql
CREATE TABLE cleaners (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ref           VARCHAR(20)  NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  NOT NULL,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  date_of_birth DATE         NOT NULL,
  joining_date  DATE         NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `items`

```sql
CREATE TABLE items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ref         VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  category    ENUM('fuel','equipment','materials','cargo','other') NOT NULL,
  unit        VARCHAR(50)  NOT NULL,
  description TEXT,
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Field Name Mapping (DB → JSON)

MySQL columns use snake_case. The mobile app expects camelCase. Map them manually when building each JSON response:

| DB column | JSON field |
|-----------|-----------|
| `license_number` | `licenseNumber` |
| `date_of_birth` | `dateOfBirth` |
| `joining_date` | `joiningDate` |
| `plate_number` | `plateNumber` |
| `last_location` | `lastLocation` |
| All other columns | same name (no change needed) |

Example — building a driver response array in PHP:

```php
$driver = [
    'id'            => (int) $row['id'],
    'ref'           => $row['ref'],
    'name'          => $row['name'],
    'phone'         => $row['phone'],
    'licenseNumber' => $row['license_number'],
    'status'        => $row['status'],
    'dateOfBirth'   => $row['date_of_birth'],
    'joiningDate'   => $row['joining_date'],
];
```

Apply the same pattern for all entities.

---

## API Endpoints

Base path: `/api`

All list endpoints support these optional query parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `search` | Free-text search (searchable fields listed per entity) | `?search=silva` |
| `status` | Filter by status value | `?status=active` |

---

### Drivers — `/api/drivers`

#### `GET /api/drivers`

Returns all drivers. Searchable by `name` and `phone`.

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "ref": "DRV-001",
      "name": "Kamal Silva",
      "phone": "0771234567",
      "licenseNumber": "B1234567",
      "status": "active",
      "dateOfBirth": "1990-05-15",
      "joiningDate": "2022-03-01"
    }
  ],
  "total": 20
}
```

---

#### `GET /api/drivers/{id}`

**Response 200:**
```json
{
  "data": {
    "id": 1,
    "ref": "DRV-001",
    "name": "Kamal Silva",
    "phone": "0771234567",
    "licenseNumber": "B1234567",
    "status": "active",
    "dateOfBirth": "1990-05-15",
    "joiningDate": "2022-03-01"
  }
}
```

**Response 404:**
```json
{ "error": "Not Found", "message": "Driver not found" }
```

---

#### `POST /api/drivers`

**Request body (JSON):**
```json
{
  "ref": "DRV-021",
  "name": "John Perera",
  "phone": "0779876543",
  "licenseNumber": "B9876543",
  "status": "active",
  "dateOfBirth": "1992-08-10",
  "joiningDate": "2024-01-15"
}
```

**Validation rules:**

| Field | Rules |
|-------|-------|
| `ref` | required, max 20 chars, unique in drivers table |
| `name` | required, max 100 chars |
| `phone` | required, max 20 chars |
| `licenseNumber` | required, max 50 chars |
| `status` | required, one of: `active`, `inactive`, `on_leave` |
| `dateOfBirth` | required, valid date, format `YYYY-MM-DD` |
| `joiningDate` | required, valid date, format `YYYY-MM-DD` |

**Response 201:** same shape as GET single  
**Response 422:** `{ "error": "Validation Failed", "message": "..." }`

---

#### `PUT /api/drivers/{id}`

Same fields as POST, all optional (partial update). Returns updated entity.

**Response 200:** same shape as GET single

---

#### `DELETE /api/drivers/{id}`

**Response 200:**
```json
{ "message": "Driver removed successfully" }
```

---

### Vehicles — `/api/vehicles`

#### `GET /api/vehicles`

Searchable by `make`, `model`, `plate_number`.

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "ref": "VEH-001",
      "plateNumber": "WP BA-1234",
      "make": "TATA",
      "model": "1615",
      "type": "lorry",
      "status": "active",
      "lastLocation": "Colombo Depot",
      "mileage": 45000,
      "year": 2020,
      "capacity": 8
    }
  ],
  "total": 50
}
```

---

#### `GET /api/vehicles/{id}` — single vehicle, same shape as above

---

#### `POST /api/vehicles`

**Request body (JSON):**
```json
{
  "ref": "VEH-051",
  "plateNumber": "WP BA-5100",
  "make": "TATA",
  "model": "407",
  "type": "lorry",
  "status": "active",
  "year": 2023,
  "capacity": 5,
  "mileage": 0,
  "lastLocation": "Colombo Depot"
}
```

**Validation rules:**

| Field | Rules |
|-------|-------|
| `ref` | required, max 20 chars, unique in vehicles table |
| `plateNumber` | required, max 20 chars, unique in vehicles table |
| `make` | required, max 50 chars |
| `model` | required, max 50 chars |
| `type` | required, one of: `lorry`, `bowser`, `tipper`, `truck`, `van`, `bus` |
| `status` | required, one of: `active`, `inactive` |
| `year` | required, integer, between 1900 and current year + 1 |
| `capacity` | required, integer, min 0 |
| `mileage` | required, integer, min 0 |
| `lastLocation` | optional, max 100 chars |

**Response 201:** same shape as GET single

---

#### `PUT /api/vehicles/{id}` — partial update, same fields all optional

#### `DELETE /api/vehicles/{id}` — `{ "message": "Vehicle removed successfully" }`

---

### Cleaners — `/api/cleaners`

#### `GET /api/cleaners`

Searchable by `name` and `phone`.

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "ref": "CLN-001",
      "name": "Sandya Perera",
      "phone": "0771112233",
      "status": "active",
      "dateOfBirth": "1985-08-20",
      "joiningDate": "2021-06-15"
    }
  ],
  "total": 20
}
```

---

#### `GET /api/cleaners/{id}` — single cleaner, same shape

---

#### `POST /api/cleaners`

**Request body (JSON):**
```json
{
  "ref": "CLN-021",
  "name": "Sandya Perera",
  "phone": "0771112233",
  "status": "active",
  "dateOfBirth": "1985-08-20",
  "joiningDate": "2024-01-10"
}
```

**Validation rules:**

| Field | Rules |
|-------|-------|
| `ref` | required, max 20 chars, unique in cleaners table |
| `name` | required, max 100 chars |
| `phone` | required, max 20 chars |
| `status` | required, one of: `active`, `inactive` |
| `dateOfBirth` | required, valid date, format `YYYY-MM-DD` |
| `joiningDate` | required, valid date, format `YYYY-MM-DD` |

**Response 201:** same shape as GET single

---

#### `PUT /api/cleaners/{id}` — partial update

#### `DELETE /api/cleaners/{id}` — `{ "message": "Cleaner removed successfully" }`

---

### Items — `/api/items`

#### `GET /api/items`

Searchable by `name`, `ref`, `category`.

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "ref": "ITM-001",
      "name": "Diesel Fuel",
      "category": "fuel",
      "unit": "liters",
      "description": "Standard diesel for fleet vehicles",
      "status": "active"
    }
  ],
  "total": 10
}
```

---

#### `GET /api/items/{id}` — single item, same shape

---

#### `POST /api/items`

**Request body (JSON):**
```json
{
  "ref": "ITM-011",
  "name": "Engine Oil",
  "category": "equipment",
  "unit": "liters",
  "description": "5W-30 synthetic engine oil",
  "status": "active"
}
```

**Validation rules:**

| Field | Rules |
|-------|-------|
| `ref` | required, max 20 chars, unique in items table |
| `name` | required, max 100 chars |
| `category` | required, one of: `fuel`, `equipment`, `materials`, `cargo`, `other` |
| `unit` | required, max 50 chars |
| `description` | optional, text |
| `status` | required, one of: `active`, `inactive` |

**Response 201:** same shape as GET single

---

#### `PUT /api/items/{id}` — partial update

#### `DELETE /api/items/{id}` — `{ "message": "Item removed successfully" }`

---

## Seed Data

The mobile app ships with JSON seed files. Use these to populate the database with realistic starting data:

| Entity | Records | Ref format | Seed file |
|--------|---------|-----------|-----------|
| Drivers | 20 | `DRV-001` … `DRV-020` | `src/data/drivers.json` |
| Vehicles | 50 | `VEH-001` … `VEH-050` | `src/data/vehicles.json` |
| Cleaners | 20 | `CLN-001` … `CLN-020` | `src/data/cleaners.json` |
| Items | 10 | `ITM-001` … `ITM-010` | `src/data/items.json` |

The JSON field names in those files match the camelCase API field names. When inserting into MySQL, map them back to snake_case columns (reverse of the Field Name Mapping table above).

---

## Database Connection

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=transport_fleet
DB_USER=your_db_user
DB_PASS=your_db_password
```
