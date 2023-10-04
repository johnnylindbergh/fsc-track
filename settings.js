
/*
  settings.js: System parameters
*/

module.exports = {

  // server port
  PORT: 5000,

  // is the system in development mode (explicit error messages, etc)
  DEV_MODE: false,

  // name of database
  DB_NAME: 'fscTrack',

  // domain through which server is accessible
  DOMAIN: 'https://shop.franksaulconstruction.com',

  /*  does the system allow automatic creation of new user accounts
      when authentication is attempted. */
  ALLOW_NEW_ACCOUNTS: false,

  /*  regex restriction to apply to emails of new accounts requesting access 
      (only if automatic creation enabled) */
  EMAIL_RESTRICTION:  /.+?@franksaulconstruction\.com$/gm,

  // name of this system
  SYSTEM_NAME: 'FSCTrack'

}
