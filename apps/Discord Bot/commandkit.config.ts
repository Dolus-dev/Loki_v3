import { posthog } from '@commandkit/analytics/posthog';
import { defineConfig } from 'commandkit';

export default defineConfig({
  plugins: [
    posthog({
      posthogOptions: {
        apiKey: 'YOUR_POSTHOG_API_KEY',
      },
    }),
  ],
});
