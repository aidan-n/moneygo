var TransactionPageConstants = require('../constants/TransactionPageConstants');

var ErrorActions = require('./ErrorActions');

var models = require('../models.js');
var Account = models.Account;
var Transaction = models.Transaction;
var Error = models.Error;

var Big = require('big.js');

function fetchTransactionPage(account, pageSize, page) {
	return {
		type: TransactionPageConstants.FETCH_TRANSACTION_PAGE,
		account: account,
		pageSize: pageSize,
		page: page
	}
}

function transactionPageFetched(account, pageSize, page, numPages,
		transactions, endingBalance) {
	return {
		type: TransactionPageConstants.TRANSACTION_PAGE_FETCHED,
		account: account,
		pageSize: pageSize,
		page: page,
		numPages: numPages,
		transactions: transactions,
		endingBalance: endingBalance
	}
}

function fetch(account, pageSize, page) {
	return function (dispatch) {
		dispatch(fetchTransactionPage(account, pageSize, page));

		$.ajax({
			type: "GET",
			dataType: "json",
			url: "account/"+account.AccountId+"/transactions?sort=date-desc&limit="+pageSize+"&page="+page,
			success: function(data, status, jqXHR) {
				var e = new Error();
				e.fromJSON(data);
				if (e.isError()) {
					dispatch(ErrorActions.serverError(e));
					return;
				}

				var transactions = [];
				var balance = new Big(data.EndingBalance);

				for (var i = 0; i < data.Transactions.length; i++) {
					var t = new Transaction();
					t.fromJSON(data.Transactions[i]);

					t.Balance = balance.plus(0); // Make a copy of the current balance
					// Keep a talley of the running balance of these transactions
					for (var j = 0; j < data.Transactions[i].Splits.length; j++) {
						var split = data.Transactions[i].Splits[j];
						if (account.AccountId == split.AccountId) {
							balance = balance.minus(split.Amount);
						}
					}
					transactions.push(t);
				}
				var a = new Account();
				a.fromJSON(data.Account);

				var numPages = Math.ceil(data.TotalTransactions / pageSize);

				dispatch(transactionPageFetched(account, pageSize, page,
					numPages, transactions, new Big(data.EndingBalance)));
			},
			error: function(jqXHR, status, error) {
				dispatch(ErrorActions.ajaxError(error));
			}
		});
	};
}

module.exports = {
	fetch: fetch
};