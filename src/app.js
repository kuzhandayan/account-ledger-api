const express = require('express');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const transferRoutes = require('./routes/transfers');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/accounts', accountRoutes);
app.use('/transactions', transactionRoutes);
app.use('/transfers', transferRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
