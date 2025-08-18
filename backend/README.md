# choma Backend

A scalable Node.js/Express backend for the choma app, using MongoDB and Mongoose.

## Features

- Modular folder structure (models, controllers, routes, middleware, config, utils)
- Environment variable support with dotenv
- MongoDB connection via Mongoose
- CORS enabled
- Ready for REST API development

## Getting Started

1. Install dependencies:

   ```bash
   npm install

   ```ins
2. Set up your `.env` file (see `.env` example in repo).

3. Start the development server:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — Start server with nodemon
- `npm start` — Start server normally

## Folder Structure

- `models/` — Mongoose models
- `controllers/` — Route logic
- `routes/` — API endpoints
- `middleware/` — Custom middleware
- `config/` — DB and app config
- `utils/` — Utility functions

---

Built with ❤️ for the Nigerian meal delivery market.


