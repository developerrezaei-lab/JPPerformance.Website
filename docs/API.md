# JP Performance API v1

The independent service owns identity, authorisation, plans and fitness data. The Vue portal consumes HTTP JSON only. The future mobile client can consume the same API without embedding business rules from the website.

Development OpenAPI: `/api/openapi/v1.json`. This document is not exposed in production by default.

| Area | Endpoint | Access |
|---|---|---|
| Session | GET `/api/v1/auth/csrf` | Anonymous; establishes anti-forgery cookie and returns `token` |
| Registration | POST `/api/v1/auth/register` | Student only; production closed unless explicitly enabled, or requested by an administrator |
| Web login | POST `/api/v1/auth/login?useCookies=true` | Identity credentials; returns HttpOnly cookie |
| Mobile login | POST `/api/v1/auth/login` | Identity credentials; returns opaque access/refresh tokens |
| Refresh | POST `/api/v1/auth/refresh` | Identity refresh token |
| Logout | POST `/api/v1/auth/logout` | Clears web session cookie |
| Profile | GET / PUT `/api/v1/me` | Current member; display name and explicit health consent |
| Exercises | GET `/api/v1/catalog/exercises` | Catalog; Redis cached |
| Foods | GET `/api/v1/catalog/foods?q=rice&after=0&take=30` | Catalog; maximum 100 rows, ascending ID cursor |
| Meal calculator | POST `/api/v1/nutrition/calculate` | Array of `{foodId, grams}`; 1–30 portions |
| Measurements | POST `/api/v1/measurements` | Own measurements; consent required |
| Progress | GET `/api/v1/progress?days=90` | Own data; optional `studentId` requires active authorised coach relationship |
| Relationships | GET `/api/v1/links?before=2147483647` | Own relationships; newest first, maximum 100 per page |
| Invite | POST `/api/v1/links` | Approved coach, existing student email |
| Consent to coach | PUT `/api/v1/links/{id}` | That student only; status Active, Declined or Revoked |
| Plans | GET `/api/v1/plans?after=0&take=50` | Own plans; optional studentId requires active authorised coach relationship |
| Assign plan | POST `/api/v1/plans` | Approved coach, active assigned student; immutable snapshot |
| Workout log | POST `/api/v1/plans/{id}/complete` | That student only, Workout kind |
| Meal diary | POST `/api/v1/meals` | Own diary; consent required |
| Team roster | GET `/api/v1/team/coaches?q=email&after=user-id` | Supervisor: assigned coaches only; Admin: all approved coaches. No athlete health records. |
| Assign supervisor | PUT `/api/v1/admin/supervision/{coachId}` | Admin; `{supervisorId:"member-id"}` or null to clear |
| Approve supervisor | PUT `/api/v1/admin/members/{id}/supervisor` | Admin; `{enabled:true/false}` |
| Admin search | GET `/api/v1/admin/members?q=email&after=0&role=Supervisor` | Administrator; `after` is offset, page size 30 |
| Approve coach | PUT `/api/v1/admin/members/{id}/coach` | Administrator; `{enabled:true/false}` |

## Client rules

Web cookies are HttpOnly and SameSite Strict. Obtain a CSRF token initially and **again after login/logout**; send it in `X-CSRF-TOKEN` on every state-changing request. Do not store web authentication tokens in localStorage. Requests use the same origin through Nginx; this version intentionally does not enable arbitrary credentialed CORS.

For native login/registration/refresh, first call CSRF and retain its cookie in the client's cookie jar; include the returned header when posting credentials or a refresh token. After login, ordinary API mutations may use `Authorization: Bearer <accessToken>` without cookies/CSRF. Only a **successfully validated** bearer token exempts a mutation from CSRF. Tokens are Microsoft's opaque Identity tokens, **not JWTs or an OAuth/OIDC authorisation server**. Access lifetime: 20 minutes; refresh: 7 days. Logout clears web cookies only; mobile removes its stored tokens. A full device/session revocation interface is not included.

Use HTTPS in production. Authentication endpoints have account lockout and per-connection rate limits. A 429 means the client must slow down; do not retry immediately. Do not log credentials, tokens, measurement payloads or food diaries.

Send UTC timestamps including `Z`; measurements/diary allow the previous two years and up to five minutes of clock skew. Each POST measurement/meal/workout log must include a random UUID `requestId`, **reuse the same ID when retrying that operation**. Unique `(StudentId, RequestId)` constraints prevent duplicate rows. A concurrent retry may return 409; refresh the relevant list before deciding whether to retry. A request ID is not a general transaction identifier and must not be reused for a different operation.

Food totals are calculated by the API from stored reference values, never accepted from client-supplied calorie totals. Meal diary and nutrition plan content store historical calculated snapshots. Source values are per 100 grams of edible food with preparation-specific entries.

Resource access to unrelated students returns 404; unauthenticated returns 401; insufficient roles 403; malformed/invalid values 400; conflicts 409. Roles are checked against current membership in the database for sensitive coach/admin endpoints, avoiding reliance on stale bearer/cookie role claims.

## Example bodies

Measurement:

```json
{"recordedAt":"2026-11-08T00:00:00Z","weightKg":72.5,"waistCm":82,"requestId":"2ac5cbae-c3c4-4399-aec0-a87605d4641b"}
```

Workout plan:

```json
{"studentId":"existing-user-id","title":"Week 1 · Full body","kind":"Workout","exercises":[{"exerciseId":"chair","sets":3,"reps":10,"restSeconds":60}]}
```

Nutrition template:

```json
{"studentId":"existing-user-id","title":"Breakfast template","kind":"Nutrition","foods":[{"foodId":1,"grams":100}]}
```

Food ID 1 is an example only; search the catalogue and choose the correct food/preparation. A Nutrition template is a list of foods/portions; this version does not represent a multi-day clinical diet.
