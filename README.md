# Curio

Curio is a SvelteKit app for tracking hobbies and activities over time. Clerk handles user authentication and Turso stores every user's data in a separate database. A deterministic database name guarantees one Curio database per Clerk user.

## Service setup

1. Create a Clerk application and copy its publishable and secret keys.
2. Create a Turso organization and a dedicated database group for Curio.
3. Create an API token and a full-access group token.
4. Copy `.env.example` to `.env` and fill in all values.

The first authenticated request provisions that user's single, regular Turso database and initializes its tables. Existing requests always resolve the same database from the hash of the Clerk user ID. Table initialization is idempotent and does not depend on Turso Multi-DB Schemas.

Milestone images are stored in a private S3-compatible Railway Bucket. Configure the five `AWS_*` variables from `.env.example`; Railway can inject them automatically from the bucket credentials. Uploads use short-lived presigned forms and images are displayed with short-lived presigned URLs.

## Development

```sh
npm install
npm run dev
```

## Production Build

```sh
npm run build
npm start
```

## Railway dev deployment

Deploy the app as a Node service. Railway detects `npm run build` and starts the generated server with `npm start`, using its injected `PORT`. Add a private Bucket in the same environment and inject its AWS-compatible credentials into the service.
