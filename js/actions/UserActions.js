var UserConstants = require('../constants/UserConstants');

var AccountActions = require('./AccountActions');
var SecurityActions = require('./SecurityActions');
var ErrorActions = require('./ErrorActions');

var models = require('../models.js');
var User = models.User;
var Session = models.Session;
var Error = models.Error;

function createUser(user) {
	return {
		type: UserConstants.CREATE_USER,
		user: user
	}
}

function userCreated(user) {
	return {
		type: UserConstants.USER_CREATED,
		user: user
	}
}

function loginUser() {
	return {
		type: UserConstants.LOGIN_USER
	}
}

function userLoggedIn(session) {
	return {
		type: UserConstants.USER_LOGGEDIN,
		session: session
	}
}

function logoutUser() {
	return {
		type: UserConstants.LOGOUT_USER
	}
}

function userLoggedOut() {
	return {
		type: UserConstants.USER_LOGGEDOUT
	}
}

function fetchUser(userId) {
	return {
		type: UserConstants.FETCH_USER,
		userId: userId
	}
}

function userFetched(user) {
	return {
		type: UserConstants.USER_FETCHED,
		user: user
	}
}

function updateUser(user) {
	return {
		type: UserConstants.UPDATE_USER,
		user: user
	}
}

function userUpdated(user) {
	return {
		type: UserConstants.USER_UPDATED,
		user: user
	}
}

function fetch(userId) {
	return function (dispatch) {
		dispatch(fetchUser());

		$.ajax({
			type: "GET",
			dataType: "json",
			url: "user/"+userId+"/",
			success: function(data, status, jqXHR) {
				var e = new Error();
				e.fromJSON(data);
				if (e.isError()) {
					dispatch(ErrorActions.serverError(e));
				} else {
					var u = new User();
					u.fromJSON(data);
					dispatch(userFetched(u));
				}
			},
			error: function(jqXHR, status, error) {
				dispatch(ErrorActions.ajaxError(error));
			}
		});
	};
}

function initializeSession(dispatch, session) {
	dispatch(userLoggedIn(session));
	dispatch(fetch(session.UserId));
	dispatch(AccountActions.fetchAll());
	dispatch(SecurityActions.fetchAll());
}

function create(user) {
	return function(dispatch) {
		dispatch(createUser(user));
		$.ajax({
			type: "POST",
			dataType: "json",
			url: "user/",
			data: {user: user.toJSON()},
			success: function(data, status, jqXHR) {
				var e = new Error();
				e.fromJSON(data);
				if (e.isError()) {
					dispatch(ErrorActions.serverError(e));
				} else {
					var u = new User();
					u.fromJSON(data);
					dispatch(userCreated(u));
				}
			},
			error: function(jqXHR, status, error) {
				dispatch(ErrorActions.ajaxError(error));
			}
		});
	};
}

function login(user) {
	return function(dispatch) {
		dispatch(loginUser());

		$.ajax({
			type: "POST",
			dataType: "json",
			url: "session/",
			data: {user: user.toJSON()},
			success: function(data, status, jqXHR) {
				var e = new Error();
				e.fromJSON(data);
				if (e.isError()) {
					dispatch(ErrorActions.serverError(e));
				} else {
					var s = new Session();
					s.fromJSON(data);
					initializeSession(dispatch, s);
				}
			},
			error: function(jqXHR, status, error) {
				dispatch(ErrorActions.ajaxError(error));
			}
		});
	};
}

function tryResumingSession() {
	return function (dispatch) {
		$.ajax({
			type: "GET",
			dataType: "json",
			url: "session/",
			success: function(data, status, jqXHR) {
				var e = new Error();
				e.fromJSON(data);
				if (e.isError()) {
					if (e.ErrorId != 1 /* Not Signed In*/)
						dispatch(ErrorActions.serverError(e));
				} else {
					var s = new Session();
					s.fromJSON(data);
					dispatch(loginUser());
					initializeSession(dispatch, s);
				}
			},
			error: function(jqXHR, status, error) {
				dispatch(ErrorActions.ajaxError(error));
			}
		});
	};
}

function logout() {
	return function (dispatch) {
		dispatch(logoutUser());

		$.ajax({
			type: "DELETE",
			dataType: "json",
			url: "session/",
			success: function(data, status, jqXHR) {
				var e = new Error();
				e.fromJSON(data);
				if (e.isError()) {
					dispatch(ErrorActions.serverError(e));
				} else {
					dispatch(userLoggedOut());
				}
			},
			error: function(jqXHR, status, error) {
				dispatch(ErrorActions.ajaxError(error));
			}
		});
	};
}

function update(user) {
	return function (dispatch) {
		dispatch(updateUser());

		$.ajax({
			type: "PUT",
			dataType: "json",
			url: "user/"+user.UserId+"/",
			data: {user: user.toJSON()},
			success: function(data, status, jqXHR) {
				var e = new Error();
				e.fromJSON(data);
				if (e.isError()) {
					dispatch(ErrorActions.serverError(e));
				} else {
					var u = new User();
					u.fromJSON(data);
					dispatch(userUpdated(u));
				}
			},
			error: function(jqXHR, status, error) {
				dispatch(ErrorActions.ajaxError(error));
			}
		});
	};
}

module.exports = {
	create: create,
	fetch: fetch,
	login: login,
	logout: logout,
	update: update,
	tryResumingSession: tryResumingSession
};
