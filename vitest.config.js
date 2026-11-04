import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Node environment: contracts and shared logic have no DOM. UI component tests,
    // when a track adds them, can set their own environment per file.
    environment: 'node',
    include: ['shared/**/*.test.js', 'src/**/*.test.js', 'backend/**/*.test.js'],
  },
})
