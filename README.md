# Personal Portfolio Starter

A responsive portfolio website built with HTML, CSS, vanilla JavaScript, Node.js, Express, and SQLite.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

1. Open this folder in VS Code.
2. Open the integrated terminal in this folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open http://localhost:3000 in your browser.

The SQLite database is created automatically at `data/portfolio.db` when the server starts. Contact form messages are saved in the `contact_messages` table.

## Verify the backend

Open http://localhost:3000/api/health. A working server returns JSON showing `status: "ok"` and `database: "connected"`.

## Personalise before publishing

Search the `public/index.html` file for `Your Name`, `your.email@example.com`, `ADD`, and `EDIT ME`. Update the sample projects, education, experience, skills, page title, and contact email. Remove any sample skill or project that does not accurately describe your work.

## Important deployment note

This is a local development starter. Before deploying publicly, add production-grade rate limiting and spam protection, configure HTTPS, and use a persistent database volume or managed database. The current SQLite file is stored on the server's local disk.
