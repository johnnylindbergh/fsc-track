
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
  // admin
  // inventory add/delete/ reorder options
  // inventory job associations menu (list of job_iventory items grouped and counted)
  // the update inventory item needs to make another query to inventory_job
  // if an item has been set to reorder when threshold is reached, use node mailer and the user defined email template. GENERATE EMAIL ONLY send text to gerry with item reorder request. if gerry approves, the email is sent if gerry declines, text: would you like to modify the order? if yes, modify order and loop if no, terminate 
  // option to change reorder email
  // option to change user data

  // worker
  // the ability to add notes to the clockOut form


  // manager
  // the ability to add notes and INVENTORY CHANGES 
  // the updateInventory function has to have a lot of stuff email and twilio integration
  // 

}
