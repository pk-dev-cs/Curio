# Curio

Curio is a SvelteKit app for tracking hobbies and activities over time. Clerk handles user authentication and Turso stores every user's data in a separate database. A deterministic database name guarantees one Curio database per Clerk user.

## Service setup

1. Create a Clerk application and copy its publishable and secret keys.
2. Create a Turso organization and a dedicated database group for Curio.
3. Create an API token and a full-access group token.
4. Copy `.env.example` to `.env` and fill in all values.
5. Create the shared Multi-DB Schema database:

```sh
npm run db:setup
```

The first authenticated request provisions that user's single database as a child of `TURSO_SCHEMA_DATABASE`. Existing requests always resolve the same database from the hash of the Clerk user ID.

## Development

```sh
npm install
npm run dev
```

## Production Build

```sh
npm run build
node build
```
