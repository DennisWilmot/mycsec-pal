import posthog from 'posthog-js';

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

if (projectToken) {
  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: '2026-05-30',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    person_profiles: 'identified_only',
    respect_dnt: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '.ph-sensitive, [data-private="true"]',
      blockSelector: '.ph-no-capture',
      recordHeaders: false,
      recordBody: false,
      captureCanvas: { recordCanvas: false },
      maskCapturedNetworkRequestFn: (request) => {
        if (request.name) request.name = request.name.split('?')[0];
        return request;
      },
    },
  });
}
