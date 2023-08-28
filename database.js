
/*
  database.js: Database connection & query functions
*/

const creds   = require('./credentials.js');
const sys     = require('./settings.js');
const mysql   = require('mysql');
const moment = require('moment')

// establish database connection
const con = mysql.createPool({
  host: 'localhost',
  user: creds.MYSQL_USERNAME,
  password: creds.MYSQL_PASSWORD,
  database: sys.DB_NAME,
  multipleStatements: true
});

module.exports = {
  connection: con,

  /*  Look up a user account by email.
      Callback on profile, if found. */
  lookUpUser: (email, cb) => {
    // retrieve user information associated with this email
    con.query('SELECT * FROM users WHERE email = ?;', [email], (err, rows) => {
      if (!err && rows !== undefined && rows.length > 0) {
        // callback on retrieved profile
        cb(err, rows[0]);
      } else {
        cb(err || "Failed to find a user with the given email.");
      }
    });
  },

  /*  Add a new system user account, given the user's Google info.
      Callback on profile of created user. */
  addUserFromGoogle: (user, cb) => {
    
    /*
      **********************************************************************
      * Rewrite as necessary to cover all necessary fields in users table. *
      **********************************************************************
    */

    // make insert and retrieve inserted profile data (assumes default role is 1)
    con.query('INSERT INTO users (email, user_type) VALUES (?, 1); SELECT * FROM users WHERE uid = LAST_INSERT_ID();', [user._json.email], (err, rows) => {
      if (!err && rows !== undefined && rows.length > 1 && rows[1].length > 0) {
        // callback on generated profile
        cb(err, rows[1][0]);
      } else {
        cb(err || "Failed to add a new user from Google account.");
      }
    });
  },

  getJobs: (req,res, cb) => {
    con.query('SELECT * FROM jobs WHERE (isArchived = 0);', (err, rows) => {
      if (!err && rows !== undefined && rows.length > 0) {
         cb(err, rows)
      } else {
         cb(err || "Failed to get jobs");
      }
    });
  },

  createJob:  (name, cb) =>{
    con.query('INSERT INTO jobs (name) VALUES (?);', [name], (err) => {
      if (!err){
        cb(err);
      } else {
        cb(err || "Failed to insert job into database.");
      }
    });
  },

  deleteJob: (jobId, cb) => {
    con.query('UPDATE jobs SET isArchived = 1 WHERE id = ?;', [jobId], (err) => {
      if (!err) {
         cb(err)
      } else {
         cb(err || "Failed to delete job");
      }
    });
  },

   recoverJob: (jobId, cb) => {
    con.query('UPDATE jobs SET isArchived = 0 WHERE id = ?;', [jobId], (err) => {
      if (!err) {
         cb(err)
      } else {
         cb(err || "Failed to recover job");
      }
    });
  },

  getTasks: (req,res, cb) => {
    con.query('SELECT * FROM tasks WHERE (isArchived = 0);', (err, rows) => {
      if (!err && rows !== undefined && rows.length > 0) {
         cb(err, rows)
      } else {
         cb(err || "Failed to get tasks");
      }
    });
  },



  createTask:  (name, cb) =>{
    con.query('INSERT INTO tasks (name) VALUES (?);', [name], (err) => {
      if (!err){
        cb(err);
      } else {
        cb(err || "Failed to insert task into database.");
      }
    });
  },

  deleteTask: (taskId, cb) => {
    con.query('UPDATE tasks SET isArchived = 1 WHERE id = ?;', [taskId], (err) => {
      if (!err) {
         cb(err)
      } else {
         cb(err || "Failed to delete Task");
      }
    });
  },

    recoverTask: (taskId, cb) => {
    con.query('UPDATE tasks SET isArchived = 0 WHERE id = ?;', [taskId], (err) => {
      if (!err) {
         cb(err)
      } else {
         cb(err || "Failed to recover Task");
      }
    });
  },

  getUsers: (cb) => {

    con.query('SELECT name, id FROM users;', (err, rows) =>{
     if (!err && rows !== undefined && rows.length > 0){
      cb(err, rows);
     } else {
      cb(err || "failed to get users;")
     }
    });

  },

  isUserClockedIn: (id, cb) => {
    //get id and email

    con.query('SELECT name, clockedIn FROM users WHERE id = ?;', [id], (err, rows) =>{
      if (!err && rows !== undefined && rows.length > 0) {
        cb(err, rows)
      } else {
        cb(err || "Failed to get user session")
      }

    });
  },

  clockIn: (id, jobId, taskId, cb) => {
    con.query('INSERT INTO timesheet (userid, job, task, clock_in) values (?, ?, ?, NOW()); SELECT * FROM timesheet WHERE id = LAST_INSERT_ID(); UPDATE users SET clockedIn = 1 where id = ?;', [id, jobId, taskId, id], (err, rows) =>{
        if (!err) {
          cb(err);
        } else {
          cb (err || "Failed to clock in.")
        } 
    });
  },

  clockOut: (id, cb) => {
    con.query('UPDATE timesheet SET clock_out = NOW() WHERE userid = ? AND clock_out IS NULL; UPDATE users SET clockedIn = 0 WHERE id = ?;', [id, id], (err) =>{
        if (!err) {
          cb(err);
        } else {
          cb (err || "Failed to clock out.")
        } 
    });
  },

  clockInAndOut: (userId, jobId, taskId, cb) => {
    con.query('SELECT clockedIn FROM users WHERE (id = ?);', [userId], (err, rows) =>{
      if (!err && rows !== undefined && rows.length > 0) {
      
        if (rows[0].clockedIn == 0){
          //clockin
          con.query('INSERT INTO timesheet (userid, job, task, clock_in) values (?, ?, ?, NOW()); SELECT * FROM timesheet WHERE id = LAST_INSERT_ID(); UPDATE users SET clockedIn = 1 where id = ?;', [userId, jobId, taskId, userId], (err, rows) =>{
            if (!err) {
              cb(err);
            } else {
              cb (err || "Failed to clock in.");
            } 
          });

        } else {

          // clockout 
          con.query('UPDATE timesheet SET clock_out = NOW() WHERE userid = ? AND clock_out IS NULL; UPDATE users SET clockedIn = 0 WHERE id = ?;', [userId, userId], (err) =>{
            if (!err) {
              cb(err);
            } else {
              cb (err || "Failed to clock out.")
            } 
          });
        
        }
      }
    });
  },

  allClockOut: (cb) => {
    con.query('UPDATE timesheet SET clock_out = NOW();');
  },


  getTimesheet: (req, res, cb) => {
    con.query('SELECT timesheet.id as uid, timesheet.userid, timesheet.job, timesheet.task, timesheet.clock_in, timesheet.clock_out, timesheet.duration, jobs.name, jobs.isArchived, users.id, users.name AS username, tasks.name AS taskname FROM timesheet JOIN jobs  ON  timesheet.job = jobs.id AND jobs.isArchived = 0 AND timesheet.clock_out IS NOT NULL INNER JOIN users ON timesheet.userid = users.id INNER JOIN tasks ON tasks.id = timesheet.task AND tasks.isArchived = 0 ORDER BY uid;', (err, rows) => {
          
          //combine rows by matching job, task, userid, 
        
            duplicates = false;
            for (var i = 0; i < rows.length; i++){
              // update blank durations
              if (rows[i].duration == undefined){
                var clock_in = moment(rows[i].clock_in)
                var clock_out = moment(rows[i].clock_out)
                rows[i].clock_in = clock_in
                rows[i].clock_out = clock_out
                var diff = moment.duration(clock_out.diff(clock_in));
                // duration in hours
                var hours = parseInt(diff.asHours());
                // duration in minutes
                var minutes = parseInt(diff.asMinutes()) % 60;
                //duration in seconds
                var seconds = parseInt(diff.asSeconds()) % 3600;

                rows[i].duration = hours + (minutes/60) + (seconds /3600);
                con.query('UPDATE timesheet SET duration = ? WHERE id = ?;', [rows[i].duration, rows[i].uid], (err) =>{
                  console.log(err)
                });
              }
            }
          var duplicates = true;
            while (duplicates){
            for (var i = 0; i < rows.length; i++){
              for (var j = i; j < rows.length; j++){
                duplicates = false;
                if (i != j && rows[i].isArchived ==0 && rows[j].isArchived == 0 && rows[i].userid == rows[j].userid && rows[i].job == rows[j].job && rows[i].task == rows[j].task){
                  duplicates = true;
                  // var duplicates = true;
                  // // combine
                  // var clock_inA = moment(rows[i].clock_in)
                  // var clock_outA = moment(rows[i].clock_out)

                  // var clock_inB = moment(rows[j].clock_in)
                  // var clock_outB = moment(rows[j].clock_out)

                  // var diffA = moment.duration(clock_outA.diff(clock_inA));
                  // var diffB = moment.duration(clock_outB.diff(clock_inB));
                  // //add differences together
                  // var total = diffA.add(diffB)

                  // var hours = parseInt(total.asHours());
                  //   // duration in minutes
                  // var minutes = parseInt(total.asMinutes()) % 60;
          
                  //console.log(total);

                  //remove duplicate entry
                 // console.log(rows[i].duration, rows[j].duration, minutes)
                  rows[i].duration = rows[i].duration + rows[j].duration
                  rows[j].isArchived = 1;
                  //console.log(rows);


                }
                
              }
            }
            
          }
        // remove deleted indicies to not confuse the mustache and format the duration
         var noDup = [];
          for (var i = 0; i < rows.length; i++){
            if (rows[i].isArchived == 0){
              rows[i].formattedDuration = moment.utc(moment.duration(rows[i].duration, 'h').asMilliseconds()).format('HH:mm');
              noDup.push(rows[i]);
            }
          }

        
        cb(err, noDup)

        
    });
  },

  getTimesheetQuery: (req, res, startDate, endDate, userId, jobId, taskId,  cb) => {
    
        // format dates into strings for query, and make inclusive range
        var startString = startDate.format('YYYY-MM-DD');
        var endString = endDate.add(1, 'days').format('YYYY-MM-DD');
      con.query('SELECT timesheet.id as uid, timesheet.userid, timesheet.job, timesheet.task, timesheet.clock_in, timesheet.clock_out, timesheet.duration, jobs.name, jobs.isArchived, users.id, users.name AS username, tasks.name AS taskname FROM timesheet JOIN jobs  ON  timesheet.job = jobs.id AND jobs.isArchived = 0 AND timesheet.clock_out IS NOT NULL INNER JOIN users ON timesheet.userid = users.id INNER JOIN tasks ON tasks.id = timesheet.task AND tasks.isArchived = 0 ORDER BY timesheet.clock_in;', (err, rows) => {
          // AND (timesheet.clock_in BETWEEN ? and ?)

          //combine rows by matching job, task, userid, 
        
            duplicates = false;
            for (var i = 0; i < rows.length; i++){
              // update blank durations
              if (rows[i].duration == undefined){
                var clock_in = moment(rows[i].clock_in)
                var clock_out = moment(rows[i].clock_out)
                rows[i].clock_in = clock_in
                rows[i].clock_out = clock_out
                var diff = moment.duration(clock_out.diff(clock_in));
                // duration in hours
                var hours = parseInt(diff.asHours());
                // duration in minutes
                var minutes = parseInt(diff.asMinutes()) % 60;
                //duration in seconds
                var seconds = parseInt(diff.asSeconds()) % 3600;

                rows[i].duration = hours + (minutes/60) + (seconds /3600);
                con.query('UPDATE timesheet SET duration = ? WHERE id = ?;', [rows[i].duration, rows[i].uid], (err) =>{
                  console.log(err)
                });
              }
            }

          var duplicates = true;
            while (duplicates){
            for (var i = 0; i < rows.length; i++){
              for (var j = i; j < rows.length; j++){
                duplicates = false;
                if (i != j && rows[i].isArchived ==0 && rows[j].isArchived == 0 && rows[i].userid == rows[j].userid && rows[i].job == rows[j].job && rows[i].task == rows[j].task){
                  duplicates = true;
                  // var duplicates = true;
                  // // combine
                  // var clock_inA = moment(rows[i].clock_in)
                  // var clock_outA = moment(rows[i].clock_out)

                  // var clock_inB = moment(rows[j].clock_in)
                  // var clock_outB = moment(rows[j].clock_out)

                  // var diffA = moment.duration(clock_outA.diff(clock_inA));
                  // var diffB = moment.duration(clock_outB.diff(clock_inB));
                  // //add differences together
                  // var total = diffA.add(diffB)

                  // var hours = parseInt(total.asHours());
                  //   // duration in minutes
                  // var minutes = parseInt(total.asMinutes()) % 60;
          
                  //console.log(total);

                  //remove duplicate entry
                 // console.log(rows[i].duration, rows[j].duration, minutes)
                  rows[i].duration = rows[i].duration + rows[j].duration
                  rows[j].isArchived = 1;


                }
                
              }
            }
            
          }
        // remove deleted indicies to not confuse the mustache and format the duration !! should this function remove duplicates ?? 
         var noDup = [];
          for (var i = 0; i < rows.length; i++){
            if (rows[i].isArchived == 0){
              rows[i].formattedDuration = moment.utc(moment.duration(rows[i].duration, 'h').asMilliseconds()).format('HH:mm');
              noDup.push(rows[i]);
            }
          }

          var filtered = noDup;

          if (userId != null){
            var userFilter = []
            for (var i = 0; i < filtered.length; i++){
              if (filtered[i].userid == userId){
                userFilter.push(filtered[i]);
              }
            }
            filtered = userFilter;
          }

          if (jobId != null){
            var jobFilter = []
            for (var i = 0; i < filtered.length; i++){
              if (filtered[i].job == jobId){
                jobFilter.push(filtered[i]);
              }
            }
            filtered = jobFilter;

          }

          if (taskId != null){
            var taskFilter = []
            for (var i = 0; i < filtered.length; i++){
              if (filtered[i].task == taskId){
                taskFilter.push(filtered[i]);
              }
            }
            filtered = taskFilter;

          }

          if (startDate.isValid()){
            var startFilter = []
            for (var i = 0; i < filtered.length; i++){
              if (moment(filtered[i].clock_out).isAfter(startDate)){
                startFilter.push(filtered[i]);
              }
            }
            filtered = startFilter;

          }

          if (endDate.isValid()){
            var endFilter = []
            for (var i = 0; i < filtered.length; i++){
              if (moment(filtered[i].clock_in).isBefore(endDate)){
                endFilter.push(filtered[i]);
              }
            }
            filtered = endFilter;

          }



        
        cb(err, filtered)
  
      });
  
  },
}
