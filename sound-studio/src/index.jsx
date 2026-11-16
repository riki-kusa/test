import React from 'react';
import {createRoot} from 'react-dom/client';
import {IntlProvider} from 'react-intl';

import App from './App.jsx';
import messages from './messages.js';
import './styles/app.global.css';

const root = createRoot(document.getElementById('root'));

root.render(
    <IntlProvider defaultLocale="ja" locale="ja" messages={messages}>
        <App/>
    </IntlProvider>
);
