const utils = require('../lib/hashUtils');
const Model = require('./model');
const Users = require('./user');

/**
 * Sessions is a class with methods to interact with the sessions table, which
 * stores the information about a session (id, hash, userId).
 * @constructor
 * @augments Model
 */
class Sessions extends Model {
  constructor() {
    super('sessions');
  }

  /**
   * Determines if a session is associated with a logged in user.
   * @params {Object} session - Session object (requires a user property)
   * @returns {boolean} A boolean indicating if the session is associated
   * with a user that is logged in.
   */
  isLoggedIn(session) {
    return !!session.user;
  }

  /**
   * Gets one record in the table matching specified conditions, and attaches user
   * information if the userId is present on the session object.
   * @param {Object} options - An object where the keys are the column names and the values
   * are the values to be matched.
   * @returns {Promise<Object>} A promise that is fulfilled with the session object
   * or rejected with the error that occured. Note that even if multiple session records
   * match the options, the promise will only be fulfilled with one.
   */
  get(options) {
    return super.get.call(this, options) // options === {tableColumnName: 'rowValue'}
      .then(session => {                 // options === {id: '3'}
        if (!session || !session.userId) {
          return session;
        }
        return Users.get({ id: session.userId }).then(user => {
          session.user = user;
          console.log(`THIS IS THE SESSION: ${JSON.stringify(session)}`);
          return session;
        });
      });
  }

  /*
  {
    "id":1,
    "hash":"8299a50b0bc79aa21ef8978371bd12553a1ee6832a575a1d60645dd27af3da0f",
    "userId":1,
    "user":{
      "id":1,
      "username":"Samantha",
      "password":"073af2e9096aa799ab542084857677f667cb94c236ed85213bf79bdfe46745dd",
      "salt":"dd51ec44ce17a4635b2f54faad8162955f8fdab835ba7c6907f9587ffb1f9b46"
    }
  }
  */

  /**
   * Creates a new session. Within this function, a hash is randomly generated.
   * @returns {Promise<Object>} A promise that is fulfilled with the results of
   * an insert query or rejected with the error that occured.
   */
  create(userId) {
    let data = utils.createRandom32String();
    let hash = utils.createHash(data);
    return super.create.call(this, { hash, userId });
  }
}

module.exports = new Sessions();
