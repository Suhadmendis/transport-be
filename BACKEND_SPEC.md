# Backend Specification — Transport Fleet Management API (Supabase)

This document is the complete guide for setting up and using the Supabase backend for the Transport Fleet Management mobile app. The app manages four entities: **Drivers**, **Vehicles**, **Cleaners**, and **Items**.

---

## Overview

| Item | Value |
|------|-------|
| Platform | [Supabase](https://supabase.com) (free tier) |
| Database | PostgreSQL 15 (managed by Supabase) |
| API | Auto-generated Supabase REST API (PostgREST) |
| Auth | Anon API key (public, read/write) |

No server, no PHP, no Node.js. Supabase generates the full REST API automatically from the database tables.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up for a free account.
2. Click **New Project**.
3. Give it a name (e.g. `transport-fleet`), set a database password, and choose the region closest to your users.
4. Wait ~2 minutes for the project to provision.
5. Go to **Project Settings → API** and note down:
   - **Project URL** — looks like `https://xxxxxxxxxxxx.supabase.co`
   - **anon / public key** — a long JWT string

You will need both of these to connect the mobile app.

---

## 2. Database Schema

Open the **SQL Editor** in your Supabase dashboard and run the following SQL in order.

### 2a. Helper function for `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2b. Drivers table

```sql
CREATE TABLE drivers (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref             VARCHAR(20)  NOT NULL UNIQUE,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20)  NOT NULL,
  license_number  VARCHAR(50)  NOT NULL,
  status          TEXT         NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'on_leave')),
  date_of_birth   DATE         NOT NULL,
  joining_date    DATE         NOT NULL,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TRIGGER set_drivers_updated_at
BEFORE UPDATE ON drivers
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2c. Vehicles table

```sql
CREATE TABLE vehicles (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref           VARCHAR(20)  NOT NULL UNIQUE,
  plate_number  VARCHAR(20)  NOT NULL UNIQUE,
  make          VARCHAR(50)  NOT NULL,
  model         VARCHAR(50)  NOT NULL,
  type          TEXT         NOT NULL
                  CHECK (type IN ('lorry', 'bowser', 'tipper', 'truck', 'van', 'bus')),
  status        TEXT         NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  last_location VARCHAR(100) NOT NULL DEFAULT 'Depot',
  mileage       INTEGER      NOT NULL DEFAULT 0,
  year          SMALLINT     NOT NULL,
  capacity      INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TRIGGER set_vehicles_updated_at
BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2d. Cleaners table

```sql
CREATE TABLE cleaners (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref           VARCHAR(20)  NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  date_of_birth DATE         NOT NULL,
  joining_date  DATE         NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TRIGGER set_cleaners_updated_at
BEFORE UPDATE ON cleaners
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2e. Items table

```sql
CREATE TABLE items (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref         VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  category    TEXT         NOT NULL
                CHECK (category IN ('fuel', 'equipment', 'materials', 'cargo', 'other')),
  unit        VARCHAR(50)  NOT NULL,
  description TEXT,
  status      TEXT         NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TRIGGER set_items_updated_at
BEFORE UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 3. Row Level Security (RLS)

By default Supabase tables are public when RLS is disabled. For this internal fleet app, run the following to ensure the anon key has full read/write access:

```sql
-- Drivers
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon full access" ON drivers FOR ALL TO anon USING (true) WITH CHECK (true);

-- Vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon full access" ON vehicles FOR ALL TO anon USING (true) WITH CHECK (true);

-- Cleaners
ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon full access" ON cleaners FOR ALL TO anon USING (true) WITH CHECK (true);

-- Items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon full access" ON items FOR ALL TO anon USING (true) WITH CHECK (true);
```

> If this is ever exposed publicly, replace the permissive policy above with proper auth rules.

---

## 4. Seed Data

The JSON files in this repository contain the starting data. Run the following SQL in the Supabase SQL Editor to populate the tables.

### Drivers (20 records)

```sql
INSERT INTO drivers (ref, name, phone, license_number, status, date_of_birth, joining_date) VALUES
('DRV-001', 'Chaminda Perera',       '0771234567', 'B1234567', 'active',   '1985-03-15', '2018-06-01'),
('DRV-002', 'Nuwan Rajapaksa',       '0712345678', 'B2345678', 'active',   '1982-07-22', '2016-03-15'),
('DRV-003', 'Kasun Fernando',        '0763456789', 'B3456789', 'active',   '1990-11-08', '2020-01-10'),
('DRV-004', 'Pradeep Silva',         '0774567890', 'B4567890', 'inactive', '1978-05-30', '2015-09-01'),
('DRV-005', 'Roshan Bandara',        '0755678901', 'B5678901', 'active',   '1987-09-14', '2019-04-20'),
('DRV-006', 'Dilshan Wickramasinghe','0766789012', 'B6789012', 'active',   '1993-01-25', '2021-07-05'),
('DRV-007', 'Asitha Jayawardena',    '0777890123', 'B7890123', 'on_leave', '1980-12-18', '2017-11-12'),
('DRV-008', 'Ruwan Dissanayake',     '0718901234', 'B8901234', 'active',   '1975-06-03', '2014-02-28'),
('DRV-009', 'Saman Kumarasinghe',    '0759012345', 'B9012345', 'active',   '1988-04-20', '2018-10-15'),
('DRV-010', 'Gayan Pathirana',       '0760123456', 'B0123456', 'inactive', '1992-08-07', '2020-05-18'),
('DRV-011', 'Tharaka Senanayake',    '0771235678', 'B1235678', 'active',   '1986-02-11', '2017-08-22'),
('DRV-012', 'Lahiru Rathnayake',     '0712346789', 'B2346789', 'active',   '1991-10-29', '2019-12-01'),
('DRV-013', 'Chathura Gunasekara',   '0763457890', 'B3457890', 'active',   '1984-07-16', '2016-06-10'),
('DRV-014', 'Nimal Weerasinghe',     '0774568901', 'B4568901', 'on_leave', '1979-03-04', '2015-01-20'),
('DRV-015', 'Sunil Mendis',          '0755679012', 'B5679012', 'active',   '1983-11-22', '2017-03-08'),
('DRV-016', 'Rajendran Krishnaswamy','0766780123', 'B6780123', 'active',   '1977-08-15', '2014-07-30'),
('DRV-017', 'Murugan Subramaniam',   '0777891234', 'B7891234', 'active',   '1989-05-08', '2019-02-14'),
('DRV-018', 'Selvam Arumugam',       '0718902345', 'B8902345', 'inactive', '1981-12-25', '2016-09-05'),
('DRV-019', 'Vijayan Kannan',        '0759013456', 'B9013456', 'active',   '1994-04-17', '2021-11-28'),
('DRV-020', 'Kumaran Rajan',         '0760124567', 'B0124567', 'active',   '1986-09-02', '2018-04-03');
```

### Vehicles (50 records)

```sql
INSERT INTO vehicles (ref, plate_number, make, model, type, status, last_location, mileage, year, capacity) VALUES
('VEH-001', 'WP BA-1234', 'TATA',           '1615',         'lorry',  'active',   'Colombo Harbour',     125000, 2018, 8),
('VEH-002', 'WP CA-5678', 'TATA',           '1210',         'lorry',  'active',   'Kelaniya Depot',       98000, 2019, 6),
('VEH-003', 'WP DA-9012', 'Ashok Leyland',  '1618',         'lorry',  'inactive', 'Colombo Depot',       187000, 2015, 10),
('VEH-004', 'WP EA-3456', 'Ashok Leyland',  'Stallion',     'lorry',  'active',   'Kandy Road',          145000, 2017, 10),
('VEH-005', 'WP FA-7890', 'Isuzu',          'Forward',      'lorry',  'active',   'Gampaha Depot',        76000, 2020, 7),
('VEH-006', 'CP AB-2020', 'TATA',           '407',          'lorry',  'active',   'Kandy Depot',         112000, 2018, 5),
('VEH-007', 'CP CB-3030', 'Ashok Leyland',  'Boss',         'lorry',  'inactive', 'Kandy Depot',         203000, 2014, 10),
('VEH-008', 'CP DB-4040', 'Isuzu',          'ELF',          'lorry',  'active',   'Peradeniya',           89000, 2019, 6),
('VEH-009', 'SP AC-7070', 'TATA',           '1615',         'lorry',  'active',   'Galle Depot',         134000, 2017, 8),
('VEH-010', 'SP BC-8080', 'Ashok Leyland',  '1618',         'lorry',  'active',   'Matara',              156000, 2016, 10),
('VEH-011', 'NW AD-2323', 'TATA',           '1210',         'lorry',  'active',   'Kurunegala Depot',     99000, 2019, 6),
('VEH-012', 'NW BD-3434', 'Isuzu',          'Forward',      'lorry',  'inactive', 'Kurunegala',          221000, 2013, 7),
('VEH-013', 'WP GA-1111', 'TATA',           '407',          'lorry',  'active',   'Nugegoda',             67000, 2021, 5),
('VEH-014', 'WP HA-2222', 'Ashok Leyland',  'Stallion',     'lorry',  'active',   'Maharagama',          143000, 2017, 10),
('VEH-015', 'WP IA-3333', 'TATA',           '1615',         'lorry',  'active',   'Pettah Market',       118000, 2018, 8),
('VEH-016', 'CP EB-5050', 'Ashok Leyland',  'Boss',         'lorry',  'inactive', 'Kegalle',             198000, 2015, 10),
('VEH-017', 'CP FB-6060', 'Isuzu',          'ELF',          'lorry',  'active',   'Nuwara Eliya',         83000, 2020, 6),
('VEH-018', 'SP CC-9090', 'TATA',           '1210',         'lorry',  'active',   'Galle',               107000, 2018, 6),
('VEH-019', 'SP DC-0101', 'Ashok Leyland',  '1618',         'lorry',  'active',   'Hambantota',          162000, 2016, 10),
('VEH-020', 'NW CD-4545', 'Isuzu',          'Forward',      'lorry',  'active',   'Puttalam',             91000, 2019, 7),
('VEH-021', 'WP JA-4444', 'TATA',           'Prima Bowser', 'bowser', 'active',   'Colombo Port',         84000, 2019, 8000),
('VEH-022', 'WP KA-5555', 'Mitsubishi Fuso','Fighter',      'bowser', 'active',   'Kelaniya',            102000, 2018, 10000),
('VEH-023', 'WP LA-6666', 'TATA',           'Prima Bowser', 'bowser', 'inactive', 'Colombo Depot',       176000, 2015, 8000),
('VEH-024', 'CP GC-2233', 'Ashok Leyland',  'Bowser',       'bowser', 'active',   'Kandy',                93000, 2019, 6000),
('VEH-025', 'CP HC-3344', 'Mitsubishi Fuso','Super',        'bowser', 'active',   'Hatton',              115000, 2018, 10000),
('VEH-026', 'SP FD-7788', 'TATA',           'Prima Bowser', 'bowser', 'active',   'Galle',                88000, 2020, 8000),
('VEH-027', 'SP GD-8899', 'Ashok Leyland',  'Bowser',       'bowser', 'inactive', 'Matara',              154000, 2016, 6000),
('VEH-028', 'NW FE-2234', 'Mitsubishi Fuso','Fighter',      'bowser', 'active',   'Kurunegala',           97000, 2019, 10000),
('VEH-029', 'NW GE-3345', 'TATA',           'Prima Bowser', 'bowser', 'active',   'Chilaw',               79000, 2020, 8000),
('VEH-030', 'WP MA-7777', 'Ashok Leyland',  'Bowser',       'bowser', 'active',   'Colombo',             108000, 2018, 6000),
('VEH-031', 'WP NA-8888', 'Mitsubishi Fuso','Super',        'bowser', 'active',   'Nugegoda',            126000, 2017, 10000),
('VEH-032', 'CP IC-4455', 'TATA',           'Prima Bowser', 'bowser', 'inactive', 'Matale',              189000, 2014, 8000),
('VEH-033', 'CP JC-5566', 'Ashok Leyland',  'Bowser',       'bowser', 'active',   'Dambulla',             72000, 2021, 6000),
('VEH-034', 'SP HD-9900', 'Mitsubishi Fuso','Fighter',      'bowser', 'active',   'Tangalle',            113000, 2018, 10000),
('VEH-035', 'NW HE-4456', 'TATA',           'Prima Bowser', 'bowser', 'active',   'Puttalam',             85000, 2019, 8000),
('VEH-036', 'WP OA-9999', 'TATA',           'Tipper',       'tipper', 'active',   'Colombo',             143000, 2017, 12),
('VEH-037', 'WP PA-1010', 'Ashok Leyland',  'Tipper',       'tipper', 'inactive', 'Colombo Depot',       217000, 2013, 15),
('VEH-038', 'CP KC-6677', 'Sinotruk',       'Howo',         'tipper', 'active',   'Kandy',                98000, 2019, 12),
('VEH-039', 'SP ID-0012', 'TATA',           'Tipper',       'tipper', 'active',   'Galle',               131000, 2017, 12),
('VEH-040', 'SP JD-1123', 'Ashok Leyland',  'Tipper',       'tipper', 'active',   'Hambantota',          104000, 2018, 15),
('VEH-041', 'NW IE-5567', 'Sinotruk',       'Howo',         'tipper', 'inactive', 'Kurunegala',          168000, 2015, 12),
('VEH-042', 'WP QA-7878', 'TATA',           'Tipper',       'tipper', 'active',   'Moratuwa',             88000, 2020, 12),
('VEH-043', 'WP RA-8989', 'Ashok Leyland',  'Tipper',       'tipper', 'active',   'Dehiwala',            117000, 2018, 15),
('VEH-044', 'WP SA-9090', 'MAN',            'TGS 26.440',   'truck',  'active',   'Colombo Port',        156000, 2016, 20),
('VEH-045', 'WP TA-0011', 'Mitsubishi Fuso','Super Great',  'truck',  'inactive', 'Colombo Depot',       232000, 2012, 25),
('VEH-046', 'EP AE-1234', 'MAN',            'TGS 18.440',   'truck',  'active',   'Trincomalee',         178000, 2015, 18),
('VEH-047', 'EP BE-5678', 'Mitsubishi Fuso','Super Great',  'truck',  'active',   'Batticaloa',          143000, 2017, 25),
('VEH-048', 'WP UA-1122', 'Toyota',         'HiAce',        'van',    'active',   'Colombo Head Office',  54000, 2021, 12),
('VEH-049', 'WP VA-2233', 'Isuzu',          'D-Max',        'van',    'active',   'Colombo Head Office',  67000, 2020, 8),
('VEH-050', 'WP WA-3344', 'TATA',           'LP 407',       'bus',    'active',   'Colombo',             203000, 2014, 40);
```

### Cleaners (20 records)

```sql
INSERT INTO cleaners (ref, name, phone, status, date_of_birth, joining_date) VALUES
('CLN-001', 'Sandya Perera',           '0771112233', 'active',   '1992-05-12', '2020-03-01'),
('CLN-002', 'Dilhani Fernando',        '0712223344', 'active',   '1988-09-25', '2018-07-15'),
('CLN-003', 'Kumari Silva',            '0763334455', 'inactive', '1995-02-18', '2021-06-10'),
('CLN-004', 'Shanika Rajapaksa',       '0774445566', 'active',   '1990-11-07', '2019-01-20'),
('CLN-005', 'Nadeesha Wickramasinghe', '0755556677', 'active',   '1987-07-30', '2017-09-08'),
('CLN-006', 'Upeksha Jayawardena',     '0766667788', 'active',   '1993-03-14', '2020-11-25'),
('CLN-007', 'Sachini Dissanayake',     '0777778899', 'active',   '1991-08-22', '2019-04-12'),
('CLN-008', 'Chathurika Bandara',      '0718889900', 'inactive', '1986-12-05', '2018-02-28'),
('CLN-009', 'Imesha Kumarasinghe',     '0759990011', 'active',   '1994-06-19', '2021-08-05'),
('CLN-010', 'Nadeeka Pathirana',       '0760001122', 'active',   '1989-04-03', '2017-12-15'),
('CLN-011', 'Janaka Senanayake',       '0771113344', 'active',   '1985-10-28', '2016-05-22'),
('CLN-012', 'Prasad Rathnayake',       '0712224455', 'active',   '1992-01-15', '2020-09-01'),
('CLN-013', 'Indika Gunasekara',       '0763335566', 'inactive', '1983-07-09', '2015-03-18'),
('CLN-014', 'Thilak Weerasinghe',      '0774446677', 'active',   '1990-03-24', '2019-07-10'),
('CLN-015', 'Bandula Mendis',          '0755557788', 'active',   '1987-11-16', '2018-01-05'),
('CLN-016', 'Yoganathan Ratnasingham', '0766668899', 'active',   '1984-05-31', '2016-10-20'),
('CLN-017', 'Sivanathan Krishnamurthy','0777779900', 'active',   '1991-09-08', '2020-02-14'),
('CLN-018', 'Uthayan Balakrishnan',    '0718880011', 'inactive', '1988-02-22', '2018-06-30'),
('CLN-019', 'Piriya Sutharsan',        '0759991122', 'active',   '1994-12-11', '2021-03-25'),
('CLN-020', 'Kavitha Murugaiah',       '0760002233', 'active',   '1986-08-17', '2017-07-08');
```

### Items (10 records)

```sql
INSERT INTO items (ref, name, category, unit, description, status) VALUES
('ITM-001', 'Diesel Fuel',             'fuel',      'liters', 'Standard diesel fuel for fleet vehicles',     'active'),
('ITM-002', 'Engine Oil (15W-40)',     'equipment', 'liters', 'Multi-grade engine oil for heavy vehicles',   'active'),
('ITM-003', 'Spare Tyres',             'equipment', 'units',  'Replacement tyres for trucks and lorries',    'active'),
('ITM-004', 'Safety Helmets',          'equipment', 'units',  'Hard hats for loading and unloading',         'active'),
('ITM-005', 'High-Vis Vests',          'equipment', 'units',  'Reflective safety vests for field staff',     'active'),
('ITM-006', 'First Aid Kits',          'equipment', 'units',  'Standard first aid kits for each vehicle',    'active'),
('ITM-007', 'Cargo Ratchet Straps',    'cargo',     'units',  'Heavy-duty tie-down straps for loads',        'active'),
('ITM-008', 'Cleaning Supplies',       'materials', 'sets',   'Vehicle cleaning products and tools',         'active'),
('ITM-009', 'Tool Kits',               'equipment', 'units',  'Basic roadside repair tool kits',             'active'),
('ITM-010', 'Water Supply Containers', 'cargo',     'units',  'Portable water containers for long-haul',     'inactive');
```

---

## 5. API Reference

### Base URL

```
https://<your-project-ref>.supabase.co/rest/v1
```

### Required Headers (every request)

```
apikey: <your-anon-key>
Authorization: Bearer <your-anon-key>
Content-Type: application/json
```

### CORS

Supabase handles CORS automatically. No extra configuration needed.

---

### Drivers — `/rest/v1/drivers`

#### `GET /rest/v1/drivers` — list all

```
GET /rest/v1/drivers
GET /rest/v1/drivers?status=eq.active
GET /rest/v1/drivers?or=(name.ilike.*silva*,phone.ilike.*077*)
GET /rest/v1/drivers?order=id.asc
```

**Response 200** — raw array:
```json
[
  {
    "id": 1,
    "ref": "DRV-001",
    "name": "Chaminda Perera",
    "phone": "0771234567",
    "license_number": "B1234567",
    "status": "active",
    "date_of_birth": "1985-03-15",
    "joining_date": "2018-06-01"
  }
]
```

To get a record count, add the header `Prefer: count=exact` — the total is returned in the `Content-Range` response header (e.g. `0-19/20`).

---

#### `GET /rest/v1/drivers?id=eq.{id}` — single record

```
GET /rest/v1/drivers?id=eq.1
```

Returns an array with one item. Extract `[0]` in the mobile app.

---

#### `POST /rest/v1/drivers` — create

Add header: `Prefer: return=representation`

**Request body:**
```json
{
  "ref": "DRV-021",
  "name": "John Perera",
  "phone": "0779876543",
  "license_number": "B9876543",
  "status": "active",
  "date_of_birth": "1992-08-10",
  "joining_date": "2024-01-15"
}
```

**Response 201** — array containing the created row.

**Validation errors** are returned as a Supabase error object:
```json
{ "code": "23514", "message": "new row violates check constraint..." }
```

---

#### `PATCH /rest/v1/drivers?id=eq.{id}` — update

Add header: `Prefer: return=representation`

Send only the fields to change:
```json
{ "status": "on_leave" }
```

**Response 200** — array containing the updated row.

---

#### `DELETE /rest/v1/drivers?id=eq.{id}` — delete

```
DELETE /rest/v1/drivers?id=eq.1
```

**Response 204** — empty body on success.

---

### Vehicles — `/rest/v1/vehicles`

Same pattern as drivers. Search by make, model, or plate_number:

```
GET /rest/v1/vehicles?or=(make.ilike.*tata*,model.ilike.*forward*,plate_number.ilike.*WP*)
GET /rest/v1/vehicles?type=eq.lorry&status=eq.active
```

**POST / PATCH body fields:** `ref`, `plate_number`, `make`, `model`, `type`, `status`, `year`, `capacity`, `mileage`, `last_location`

**DELETE response:** 204 empty body.

---

### Cleaners — `/rest/v1/cleaners`

Same pattern as drivers. Search by name or phone:

```
GET /rest/v1/cleaners?or=(name.ilike.*perera*,phone.ilike.*077*)
```

**POST / PATCH body fields:** `ref`, `name`, `phone`, `status`, `date_of_birth`, `joining_date`

---

### Items — `/rest/v1/items`

Search by name, ref, or category:

```
GET /rest/v1/items?or=(name.ilike.*fuel*,ref.ilike.*ITM-00*,category.eq.fuel)
GET /rest/v1/items?category=eq.equipment&status=eq.active
```

**POST / PATCH body fields:** `ref`, `name`, `category`, `unit`, `description`, `status`

---

## 6. Field Name Mapping (DB → Mobile App)

Supabase returns column names exactly as stored in the database (snake_case). The mobile app expects camelCase. Apply this mapping in the mobile app's API layer:

| DB column (Supabase response) | Mobile app field |
|-------------------------------|-----------------|
| `license_number` | `licenseNumber` |
| `date_of_birth` | `dateOfBirth` |
| `joining_date` | `joiningDate` |
| `plate_number` | `plateNumber` |
| `last_location` | `lastLocation` |
| All other columns | same name |

When **sending** data to Supabase (POST / PATCH), reverse the mapping — convert camelCase fields from the mobile app back to snake_case before sending.

---

## 7. Connecting the Mobile App

Install the Supabase JS client in the mobile app:

```bash
npm install @supabase/supabase-js
```

Create `src/api/client.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://<your-project-ref>.supabase.co';
const SUPABASE_ANON_KEY = '<your-anon-key>';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

Example usage in `src/api/driversApi.ts`:

```ts
import { supabase } from './client';

export async function getDrivers(search?: string, status?: string) {
  let query = supabase.from('drivers').select('*');
  if (status) query = query.eq('status', status);
  if (search) query = query.or(`name.ilike.*${search}*,phone.ilike.*${search}*`);
  const { data, error } = await query.order('id');
  return { data, error };
}

export async function getDriver(id: number) {
  return supabase.from('drivers').select('*').eq('id', id).single();
}

export async function createDriver(driver: object) {
  return supabase.from('drivers').insert(driver).select().single();
}

export async function updateDriver(id: number, changes: object) {
  return supabase.from('drivers').update(changes).eq('id', id).select().single();
}

export async function deleteDriver(id: number) {
  return supabase.from('drivers').delete().eq('id', id);
}
```

Apply the same pattern for vehicles, cleaners, and items.

---

## 8. Environment Variables

Never hardcode the Supabase URL or anon key directly in source files. Use a `.env` file:

```
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are safe to expose in a client-side app (the anon key is public by design), but keep them out of version control anyway.
