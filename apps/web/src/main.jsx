import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/lib/setupPdfWorker.js';
import App from '@/App';
import ErrorBoundary from '@/components/ErrorBoundary';
import { bootstrapNative } from '@/native/nativeBootstrap.js';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
	<ErrorBoundary>
		<App />
	</ErrorBoundary>
);

// Fire-and-forget native init. Safe no-op on the web.
bootstrapNative().catch(() => {
	/* noop */
});
