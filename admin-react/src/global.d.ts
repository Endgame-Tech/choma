// Lightweight ambient declaration for `process.env` in the admin-react frontend
// Keeps frontend bundle free of Node.js types while satisfying TypeScript
declare var process: {
  env: { [key: string]: string | undefined }
}

export {}
