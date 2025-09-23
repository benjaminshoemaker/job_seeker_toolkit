import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode, command }) => {
  const isVitest = !!process.env.VITEST;
  return {
    // Avoid SWC/tinypool during tests; Vite's default esbuild handles TS/JSX fine
    plugins: isVitest ? [] : [react()],
    resolve: {
      alias: [
        { find: /(.*)@\d[\w.-]*$/, replacement: '$1' },
      ],
    },
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      globals: true,
      css: false,
      pool: 'forks',
      // Run tests in a single thread to avoid worker spawn issues in
      // sandboxed environments (prevents tinypool recursion/crashes).
      poolOptions: {
        threads: { singleThread: true },
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        reportsDirectory: './coverage',
        all: false,
        include: ['src/**/*.{ts,tsx}', 'server/**/*.{ts,js}'],
        exclude: ['**/*.test.*', 'src/components/ui/**/*', 'server/**/*.test.*'],
      },
    },
  };
});
