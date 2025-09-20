// Lightweight ambient declaration for `process.env` used in frontend code.
// Keeps frontend types small and avoids pulling in full Node.js type definitions.
declare var process: {
  env: { [key: string]: string | undefined }
}

export {}
