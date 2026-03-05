# 🏨 Hotel Manager — Backend API

System zarządzania rezerwacjami hotelowymi — REST API z bazą PostgreSQL (Supabase).

## Technologie

| Warstwa | Technologia |
|---|---|
| Runtime | Node.js + Express 5 |
| Baza danych | PostgreSQL (Supabase) |
| ORM | Prisma |
| Uwierzytelnianie | Bearer Token + bcrypt PIN |
| Hosting | Render.com |

## Uruchomienie lokalne

```bash
# 1. Zainstaluj zależności
npm install

# 2. Skopiuj .env.example do .env i uzupełnij zmienne
cp .env.example .env

# 3. Zsynchronizuj schemat z bazą
npx prisma db push

# 4. Uruchom serwer
npm start        # produkcja
```

## Zmienne środowiskowe (.env)

| Zmienna | Opis |
|---|---|
| `DATABASE_URL` | URL połączenia Prisma (pooler) |
| `DIRECT_URL` | Bezpośredni URL (migracje) |
| `FRONTEND_URL` | Dozwolone originy CORS (oddzielone przecinkami) |
| `API_SECRET` | Bearer token (opcjonalny — brak = tryb publiczny) |
| `PORT` | Port serwera (domyślnie 5000) |

## Endpointy API

### Pokoje `/api/rooms`
| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/` | Lista pokoi |
| POST | `/` | Utwórz pokój |
| PUT | `/:id` | Edytuj pokój |
| PUT | `/:id/status` | Zmień status (clean/occupied/dirty) |
| DELETE | `/:id` | Usuń pokój |

### Goście `/api/guests`
| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/` | Lista gości |
| POST | `/` | Utwórz gościa |
| PUT | `/:id` | Edytuj gościa |
| DELETE | `/:id` | Usuń gościa |

### Rezerwacje `/api/reservations`
| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/` | Aktywne rezerwacje |
| GET | `/archived` | Historia (zarchiwizowane) |
| POST | `/` | Utwórz rezerwację (z kontrolą konfliktów) |
| PUT | `/:id` | Edytuj rezerwację |
| PUT | `/:id/acknowledge` | Potwierdź nową rezerwację iCal |
| DELETE | `/:id` | Archiwizuj (soft-delete) |
| DELETE | `/bulk/delete` | Archiwizuj wiele |

### iCal `/api/ical`
| Metoda | Ścieżka | Opis |
|---|---|---|
| POST | `/sync` | Import z Booking.com |
| GET | `/export/:categoryIds/calendar.ics` | Eksport per kategoria |
| GET | `/export/room/:roomId/calendar.ics` | Eksport per pokój |

### Ustawienia `/api/settings`
| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/:key` | Pobierz ustawienie |
| POST | `/` | Upsert ustawienia |
| POST | `/verify-pin` | Weryfikacja PIN (rate-limited) |
| PUT | `/pin` | Zmiana PIN (rate-limited) |

## Testy

```bash
npm test
```

16 smoke-testów API (Jest + supertest): endpointy GET, walidacja wejść, CRUD gościa, eksport iCal.

## Schemat bazy danych

```
Room ──┐
       ├── Reservation (soft-delete via archived)
Guest ─┘

Setting (key-value store: logo, kategorie, PIN)
```

## Zabezpieczenia

- 🔒 **Bearer Token** — opcjonalny middleware auth
- 🔐 **bcrypt PIN** — hashowanie haseł administracyjnych
- ⏱️ **Rate-limiting** — 10 prób/15 min na endpointy PIN
- 🌐 **CORS whitelist** — tylko dozwolone domeny frontendowe
