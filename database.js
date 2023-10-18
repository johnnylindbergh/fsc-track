
/*
  database.js: Database connection & query functions
*/

const creds   = require('./credentials.js');
const sys     = require('./settings.js');
const mysql   = require('mysql');
const moment = require('moment');
moment().format();

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
    con.query('INSERT INTO users (email, name, user_type) VALUES (?, ?, 1); SELECT * FROM users WHERE uid = LAST_INSERT_ID();', [user._json.email, user._json.name], (err, rows) => {
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

  getJobName: (jobId, cb) => {
    con.query('SELECT (name) FROM jobs WHERE (isArchived = 0) AND (id = ?);',[jobId], (err, rows) => {
      if (!err && rows !== undefined && rows.length > 0) {
         cb(err, rows[0].name);
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

    con.query('SELECT * FROM users;', (err, rows) =>{
     if (!err && rows !== undefined && rows.length > 0){
      cb(err, rows);
     } else {
      cb(err || "failed to get users;")
     }
    });

  },


// CREATE TABLE timesheet (
//   id INT NOT NULL AUTO_INCREMENT,
//   userid INT,
//   job INT,
//   task INT,
//   clock_in DATETIME,
//   clock_out DATETIME,
//   duration float(8),
//   notes VARCHAR(64),
//   FOREIGN KEY (job) REFERENCES jobs(id),
//   FOREIGN KEY (task) REFERENCES tasks(id),
//   FOREIGN KEY (userid) REFERENCES users(id),

// CREATE TABLE users (
//   id INT NOT NULL AUTO_INCREMENT,
//   user_type INT DEFAULT 2,
//   name VARCHAR(64),
//   email VARCHAR(64),
//   phone_number VARCHAR(64),
//   clockedIn TINYINT(1) DEFAULT 0,
//   public_key VARCHAR(64),
//   authentication_token VARCHAR(64),
//   FOREIGN KEY (user_type) REFERENCES user_types(id),
//   PRIMARY KEY (id)

// );


//  PRIMARY KEY (id)

     getUsersHours: (cb) => {

    con.query('SELECT timesheet.userid AS UserID, users.name as name SUM(timesheet.duration) AS TotalDuration FROM timesheet JOIN users users.id = timesheet.userid GROUP BY timesheet.userid;', (err, rows) =>{

      if (!err && rows !== undefined && rows.length > 0){

      cb(err, users);
     } else {
      cb(err || "failed to get users;")
     }
    });

  },

  getReorderEmail: (cb) =>{
    cb(creds.serverEmail);
  },

   getAllUserData: (cb) => {

    con.query('SELECT * FROM users;', (err, rows) =>{
     if (!err && rows !== undefined && rows.length > 0){
      cb(err, rows);
     } else {
      cb(err || "failed to get users;")
     }
    });

  },

  updateUserData: (userData, cb) => {
    //?

  },


  isUserClockedIn: (id, cb) => {
    //get id and email

    con.query('SELECT (name, clockedIn) FROM users WHERE id = ?;', [id], (err, rows) =>{
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

  clockOutAll: (cb) => {
    con.query('UPDATE timesheet SET clocked_out = NOW() WHERE clocked_out IS NULL;', (err) =>{
      cb(err);
    });


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
         // remove deleted indicies to not confuse the mustache and format the duration
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

   getTimesheetQueryToCSV: (req, res, startDate, endDate, userId, jobId, taskId,  cb) => {

         // format dates into strings for query, and make inclusive range
         var startString = startDate.format('YYYY-MM-DD');
         var endString = endDate.add(1, 'days').format('YYYY-MM-DD');
       con.query('SELECT timesheet.id as uid, timesheet.userid, timesheet.job, timesheet.task, timesheet.clock_in, timesheet.clock_out, timesheet.duration, jobs.name, jobs.isArchived, users.id, users.name AS username, tasks.name AS taskname FROM timesheet JOIN jobs  ON  timesheet.job = jobs.id AND jobs.isArchived = 0 AND timesheet.clock_out IS NOT NULL INNER JOIN users ON timesheet.userid = users.id INNER JOIN tasks ON tasks.id = timesheet.task AND tasks.isArchived = 0 ORDER BY timesheet.clock_inINTO OUTFILE "/var/fsc/mysql-files/timesheet.csv";', (err, rows) => {
           // AND (timesheet.clock_in BETWEEN ? and ?)


           var filtered = rows;

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




         cb(filtered);

       });

   }, 

    newInventoryItem:(name, quantity, cb) =>{
      con.query('INSERT INTO inventory (name, quantity) VALUES (?, ?)', [name, quantity],(err) => {
        if (!err){
          cb(err);
        } else {
          cb(err | "failed to update inventory")
        }
      });

    },
    // updates inventory quantity and should also check if the quantity is below set threshold
    // if quantity is below threshold AND the reorder boolean is true, the order item function should be called with (itemId, quantity)

    updateInventoryQuantity:(req, res, cb) =>{
      console.log(req.body);
      var inventoryId = req.body.item;
      var quantityUsed = req.body.quantity

      var reorder = req.body.reorder;
      if (inventoryId.length == quantityUsed.length && inventoryId.length >0){
        console.log("Updating " + inventoryId.length + " items.")
        for (var i = 0; i < inventoryId.length; i++){
          var item = parseInt(inventoryId[i]);
          var quantity = parseInt(quantityUsed[i]);
          console.log("item:", item);
          console.log("quantity:", quantity);

          con.query('SELECT quantity, threshold, reorder FROM inventory WHERE id = ?;', [item],(err, rows)=>{
            if (!err && rows.length > 0){
              console.log(rows);
              var newQuantity = rows[0].quantity - quantity;
              if (newQuantity < rows[0].threshold && rows[0].reorder){
                  // send reorder email with sendReorderEmail(item, threshold, )
              }

               con.query('UPDATE inventory SET quantity = ? WHERE id = ?;', [newQuantity, item], (err) => {
                console.log(err);
                
              });
             
            }
          });
        }

         cb(null);
      }
      
    },

  


    updateInventoryQuantityManager:(req, res, cb) =>{
      //for (int)
      var quantity = req.body.quantity
    },

    getInventory:(cb) => {
      con.query('SELECT * FROM inventory;', (err, rows)=>{
        if(!err && rows.length > 0){
          cb(err, rows);
        } else {
          cb(err | "The Inventory is Empty.")
        }
      });
    },

    updateInventory: (body, cb) => {
      for (var i = 0; i < body.item_name.length; i++){
        if (body.threshold[i] == null){
          body.threshold[i] = 0;
        }
        con.query('UPDATE inventory SET name = ?, quantity = ?, threshold = ? WHERE id = ?;',[body.item_name[i], body.quantity[i], body.threshold[i], body.id[i]], (err) =>{
          console.log(err);
        });
       
      }
      if (body.reorder == null){
        body.reorder = [];
      }
      for (var i = 0; i < body.id.length; i++){
        con.query('UPDATE inventory SET reorder = 0 where id = ?;',[body.id[i]], (err)=>{

          });
        for (var j = 0; j < body.reorder.length; j++){
          if (body.id[i] == body.reorder[j]){
              con.query('UPDATE inventory SET reorder = 1 where id = ?;',[body.id[i]], (err)=>{

              });
          }
        }
       
      }
        cb(null);
       
    },

        updateInventoryManager: (body, cb) => {
      for (var i = 0; i < body.item_name.length; i++){
        if (body.threshold[i] == null){
          body.threshold[i] = 0;
        }
        con.query('UPDATE inventory SET name = ?, quantity = ?, threshold = ? WHERE id = ?;',[body.item_name[i], body.quantity[i], body.threshold[i], body.id[i]], (err) =>{
          console.log(err);
        });
       
      }
      if (body.reorder == null){
        body.reorder = [];
      }
      for (var i = 0; i < body.id.length; i++){
        con.query('UPDATE inventory SET reorder = 0 where id = ?;',[body.id[i]], (err)=>{

          });
        for (var j = 0; j < body.reorder.length; j++){
          if (body.id[i] == body.reorder[j]){
              con.query('UPDATE inventory SET reorder = 1 where id = ?;',[body.id[i]], (err)=>{

              });
          }
        }
       
      }
        cb(null);
       
    },

    getPhoneNumber:(id, cb) => {
      con.query('SELECT phone_number FROM users where id = ?;', [id], (err, rows)=>{
        if (!err && rows.length > 0){
          cb(rows[0]);
        }
      });
    },

    updateUsers: (req, res, cb) =>{
	for (var i = 0; i < req.body.id.length; i++){
		console.log("userid:",req.body.id[i])
		console.log("name:",req.body.name[i])
		console.log("userType change to dropdown:",req.body.user_type[i])
		console.log("email:",req.body.email[i])
		console.log("phone_number:",req.body.phone_number[i])
	}
	cb("update users in progress")
    }


 

}
