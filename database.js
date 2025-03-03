
const creds   = require('./credentials.js');
const sys     = require('./settings.js');
const mysql   = require('mysql');
const moment = require('moment-timezone');
const date = require('date-and-time') 
moment.tz([2012, 0], 'America/New_York').format('zz');    // Eastern Standard Time

// establish database connection
const con = mysql.createPool({
  host: 'localhost',
  user: creds.MYSQL_USERNAME,
  password: creds.MYSQL_PASSWORD,
  database: sys.DB_NAME,
  multipleStatements: true
});

let cachedWeeks = [];
let cachedNominalWeeks = []; // array of strings to display in form


module.exports = {
  connection: con,
  cachedNominalWeeks:cachedNominalWeeks,

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

  getUser: (userId, cb) => {

    con.query('SELECT * FROM users where id = ?;', [userId], (err, rows) =>{
     if (!err && rows !== undefined && rows.length > 0){
      cb(rows);
     } else {
      cb(err || "failed to get users;")
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

    con.query('SELECT timesheet.userid AS UserID, users.name as name, SUM(timesheet.duration) AS TotalDuration FROM timesheet JOIN users ON users.id = timesheet.userid GROUP BY timesheet.userid;', (err, rows) =>{

      if (!err && rows !== undefined && rows.length > 0){

      cb(err, rows);
     } else {
      cb(err || "failed to get users;")
     }
    });

  },

  getUserHours: (userid, cb) => {

    con.query('SELECT timesheet.userid AS UserID, users.name AS name, timesheet.duration, timesheet.clock_in,  TIMEDIFF(clock_out, clock_in) as duration, notes, job, task FROM timesheet JOIN users ON users.id = timesheet.userid WHERE timesheet.userid = ? ORDER BY timesheet.clock_in DESC LIMIT 36;', [userid], (err, rows) =>{
      rows.forEach((row) => {
        row.duration = moment.duration(row.duration).asHours().toFixed(3);
        row.clock_in = moment(row.clock_in).toISOString();
      });

      if (!err && rows !== undefined && rows.length > 0){
      cb(err,rows); 
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

  clockIn: (id, cb) => {
    if (id){
      con.query('INSERT INTO timesheet (userid, clock_in) values (?, NOW()); SELECT * FROM timesheet WHERE id = LAST_INSERT_ID(); UPDATE users SET clockedIn = 1 where id = ?;', [id, id], (err, rows) =>{
          if (!err) {
            cb(err);
          } else {
            cb (err || "Failed to clock in.")
          } 
      });
    } else {
      cb("Failed to clock in, missing job or task id");
    }
  },

  getClockInDuration: (userId, cb) => {
    if (userId != null){
      con.query('SELECT * FROM timesheet WHERE userid = ? AND clock_out is NULL;', [userId], (err,rows) => {
        
        if (!err && rows !== undefined && rows.length > 0) {
          cb(err, rows)
        } else {
          cb(err || "Failed to get clock in duration")
        }
          

      });
    }
  },



  clockOut: (req, cb) => {

    var job = req.body.jobName;
    var task = req.body.taskName;
    var userId = req.user.local.id;
    var notes = req.body.notes;

    if (!task && !job){
      cb("Failed to clock out, missing job or task id");
    }

    con.query('select * from timesheet where userid = ? and clock_out is NULL;', [userId], (err, rows) => {
      if (!err && rows !== undefined && rows[0]){
        con.query('UPDATE timesheet SET clock_out = NOW(), notes = ?, job = ?, task = ? WHERE userid = ? AND clock_out IS NULL; UPDATE users SET clockedIn = 0 WHERE id = ?;', [notes, job, task, userId, userId], (err) =>{
          if (!err) {
            con.query('UPDATE timesheet set duration = TIMESTAMPDIFF(SECOND, timesheet.clock_in, timesheet.clock_out)/3600  WHERE id = ? AND clock_out IS NOT NULL;', [rows[0].id], (err) =>{
              if (!err){
                cb(err);
              } else {
                cb(err || "Failed to update duration");
              }
            });
          } else {
            cb (err || "Failed to clock out.")
          } 
        });
      }
    });
  },


  // toggle user clock in status
// need to be updated
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

  // clockout all users;
  clockOutAll: (cb) => {
    con.query('select * from timesheet where clock_out is NULL;', (err, rows) => {
      if (!err && rows !== undefined && rows.length > 0){
        for (var i = 0; i < rows.length; i++){
          var userStillClockedIn = rows[i];
          con.query('UPDATE timesheet SET clock_out = NOW(), notes = "-- auto clock out --" WHERE id = ?;', [userStillClockedIn.id], (err) =>{
            if (!err){
              con.query('UPDATE timesheet set duration = TIMESTAMPDIFF(SECOND, timesheet.clock_in, timesheet.clock_out)/3600  WHERE id = ? AND clock_out IS NOT NULL; UPDATE users SET clockedIn = 0 where id = ?', [userStillClockedIn.id, userStillClockedIn.userid], (err)=>{
                if (!err){

                } else {

                }
              });
            }
          });
        };
      }
    });
  },

  getWholeTimesheet: (req,res,cb) =>{
        con.query('SELECT timesheet.id as uid, timesheet.userid, timesheet.job, timesheet.task, timesheet.clock_in, timesheet.clock_out, timesheet.duration, timesheet.notes, jobs.name, jobs.isArchived, users.id, users.name AS username, tasks.name AS taskname FROM timesheet LEFT JOIN jobs  ON  timesheet.job = jobs.id AND jobs.isArchived = 0 AND timesheet.clock_out IS NOT NULL INNER JOIN users ON timesheet.userid = users.id LEFT JOIN tasks ON tasks.id = timesheet.task AND tasks.isArchived = 0 ORDER BY timesheet.clock_in ASC;', (err, rows) => {
          if (!err){
            cb(rows);
          } else {
            console.log("getWholeTimesheet Query fail: " + err);


            cb(err);
          }
        });


  },            

  // updateAllDurations: () =>{
  //   con.query('SELECT clock_in, clock_out, TIMEUPDATE timesheet set duration = TIMESTAMPDIFF(SECOND, timesheet.clock_in, timesheet.clock_out)/3600;', (err, rows)=>{
  //     if (!err && rows.length >0){
  //       // compute durations
  //       for (let i = 0; i < rows.length; i++){
  //         //console.log(rows[i].duration);
  //        // var duration = moment.duration(rows[i].duration);
  //         //console.log(duration.asHours());
  //         //rows[i].duration = duration.asHours();



  //         con.query('UPDATE timesheet SET duration = ? WHERE id = ?;', [rows[i].duration, rows[i].id], (err) => {
  //           if (!err){
  //             //console.log("updated duration")
  //           } else {
  //             console.log(err);
  //           }
  //         });
  //       }
  //     } else {
  //       console.log(err);
  //     }
      
  //   });
  // },

  getTimesheet: (req, res, cb) => {
    con.query('SELECT timesheet.id as uid, timesheet.userid, timesheet.job, timesheet.task, timesheet.clock_in, timesheet.clock_out, timesheet.duration, jobs.name, jobs.isArchived, users.id, users.name AS username, tasks.name AS taskname FROM timesheet JOIN jobs  ON  timesheet.job = jobs.id AND jobs.isArchived = 0 AND timesheet.clock_out IS NOT NULL INNER JOIN users ON timesheet.userid = users.id INNER JOIN tasks ON tasks.id = timesheet.task AND tasks.isArchived = 0 ORDER BY timesheet.clock_in ASC;', (err, rows) => {
          
          //combine rows by matching job, task, userid, 
        
         
            for (var i = 0; i < rows.length; i++){

                con.query('UPDATE timesheet SET duration = ? WHERE id = ?;', [rows[i].duration, rows[i].uid], (err) =>{
                  if (err){
                    console.log(err);
                  }
                });
              }

            // format the duration
          var duplicates = false;// dont remove duplicates 
            while (duplicates){
            for (var i = 0; i < rows.length; i++){
              for (var j = i; j < rows.length; j++){
                duplicates = false;
                if (i != j && rows[i].isArchived ==0 && rows[j].isArchived == 0 && rows[i].userid == rows[j].userid && rows[i].job == rows[j].job && rows[i].task == rows[j].task){
                  duplicates = true;

                  //rows[i].duration = rows[i].duration + rows[j].duration
                  //rows[j].isArchived = 1;

                  //console.log(rows);


                }
                
              }
            }
            
          }
        // remove deleted indicies to not confuse the mustache and format the duration
         var noDup = [];
          for (var i = 0; i < rows.length; i++){
            if (rows[i].isArchived == 0){
             // rows[i].formattedDuration = moment.utc(moment.duration(rows[i].duration, 'h').asMilliseconds()).format('HH:mm');
              noDup.push(rows[i]);
            }
          }

        
        cb(err, noDup)

        
    });
  },

  calulateWeeks: (cb) =>{

  },

  getWeek: (cb) => {
    // get the last 5 weeks and store as a local variable
    con.query('SELECT * FROM timesheet order by clock_in;', (err, rows)=>{
      if (!err){


      }
    });

  },

  getTimesheetQuery: (req, res, startDate, endDate, userId, jobId, taskId, weekId,  cb) => {

    // format dates into strings for query, and make inclusive range
    var startString = startDate.format('YYYY-MM-DD');
    var endString = endDate.add(1, 'days').format('YYYY-MM-DD');
  con.query('SELECT timesheet.id as uid, timesheet.userid, timesheet.job, timesheet.task, timesheet.clock_in, timesheet.clock_out, TIMEDIFF(timesheet.clock_out, timesheet.clock_in) as duration, timesheet.notes, jobs.name, jobs.isArchived, users.id, users.name AS username, tasks.name AS taskname FROM timesheet LEFT JOIN jobs  ON  timesheet.job = jobs.id AND jobs.isArchived = 0 AND timesheet.clock_out IS NOT NULL INNER JOIN users ON timesheet.userid = users.id LEFT JOIN tasks ON tasks.id = timesheet.task AND tasks.isArchived = 0 ORDER BY timesheet.clock_in;', (err, rows) => {
      // AND (timesheet.clock_in BETWEEN ? and ?)

      // format the duration 

      var duration;
      for (var i = 0; i < rows.length; i++){
        duration = moment.duration(rows[i].duration);
        rows[i].duration = duration.asHours().toFixed(3);
      }


      //combine rows by matching job, task, userid, 

        duplicates = false;
        for (var i = 0; i < rows.length; i++){
          // update blank durations
  //        if (rows[i].duration == undefined){
            var clock_in = moment(rows[i].clock_in);
            var clock_out = moment(rows[i].clock_out);
            rows[i].clock_in = clock_in; 
            rows[i].clock_out = clock_out; 

     
      
         // }
        }

      var duplicates = false;

        while (duplicates){
        for (var i = 0; i < rows.length; i++){
          for (var j = i; j < rows.length; j++){
            duplicates = false;
            if (i != j && rows[i].isArchived ==0 && rows[j].isArchived == 0 && rows[i].userid == rows[j].userid && rows[i].job == rows[j].job && rows[i].task == rows[j].task){
              duplicates = true;

              //rows[i].duration = rows[i].duration + rows[j].duration
              rows[j].isArchived = 1;


            }

          }
        }

      }
    // remove deleted indicies to not confuse the mustache and format the duration
     var noDup = [];
      for (var i = 0; i < rows.length; i++){
        if (rows[i].isArchived == 0){
          //rows[i].formattedDuration = moment.utc(moment.duration(rows[i].duration, 'h').asMilliseconds()).format('HH:mm');

          noDup.push(rows[i]);
        }
      }

  

      var filtered = rows;

     if (weekId != null){
        filtered = cachedWeeks[weekId];
      }



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
            //filtered[i].clock_out = moment(filtered[i].clock_out).format('YYYY-MM-DD');
            
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


       if (weekId != null){
        filtered = cachedWeeks[weekId];
      }

      for(var i = 0; i < filtered.length; i++){
        filtered[i].date = moment(filtered[i].clock_in).format('Do MMMM, YYYY');
        filtered[i].clock_in= moment(filtered[i].clock_in).format('hh:mm a');
        filtered[i].clock_out= moment(filtered[i].clock_out).format('hh:mm a');

      }

      let transformedArray = filtered.map(item => {
        return {
          username: item.username,
          date: item.date,
          clock_in: item.clock_in,
          clock_out: item.clock_out,
          duration: item.duration,
          notes: item.notes,
          name: item.name,
          taskname: item.taskname
        };
      });
      //console.log(transformedArray);



    cb(err, transformedArray)

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
      var inventoryId = req.body.id;
      var quantityUsed = req.body.quantity
      var total = req.body.total;
      var items = [req.body.item]; // ie the box was checked but listen to the quantity used
      var currentJob = req.body.jobId;


      if (inventoryId.length == quantityUsed.length && inventoryId.length >0){

        for (var i = 0; i < inventoryId.length; i++){
          if (quantityUsed[i] != ''){

            
            var item = parseInt(inventoryId[i]);
            var quantity = parseInt(quantityUsed[i]);
           // console.log("item:", item);
            //console.log("quantity:", quantity);

            con.query('SELECT quantity, threshold, reorder FROM inventory WHERE id = ?;', [item],(err, rows)=>{
              if (!err && rows.length > 0){
                //console.log(rows);
                var newQuantity = rows[0].quantity - quantity;
                if (newQuantity < rows[0].threshold && rows[0].reorder){
                    // send reorder email with sendReorderEmail(item, threshold, )
                    //console.log("sending reorderEmail")
                }

                 con.query('UPDATE inventory SET quantity = ? WHERE id = ?;', [newQuantity, item], (err) => {
                      console.log(err);

                  
                });
		// job id needs to be added to the manager update inventory form
		 con.query('INSERT INTO inventory_job (jobid, inventoryid) values (?,?)', [currentJob, item], (err)=>{
			console.log(err);	
		 });               
              }
            });
          }
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
      
        body.quantity[i] /= 1.0; 
        body.threshold[i] /= 1.0;
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


    updateUser: (req, res, cb) =>{
      //console.log("userid:",req.body.id)
      // console.log("name:",req.body.name)
      // console.log("userType change to dropdown:",req.body.user_type)
      // console.log("email:",req.body.email)

      con.query('UPDATE users SET name = ?, user_type = ?, email = ? WHERE id = ?;', [req.body.name, req.body.user_type,req.body.email, req.body.id], (err)=>{

        if (!err){
          cb(err);
        } else {
          console.log("failed to update user");
        }
      });
 
    },

    getTestData: function(n){
      // populates the timesheet table with test data
      var randomDate = moment();
      for (var i = 0; i < n; i++){
        randomDate.subtract(Math.random() * 5, 'd');
        //(randomDate.format('YYYY-MM-DD'));

        con.query('INSERT INTO timesheet (userid, job, task, clock_in, clock_out) VALUES (1, 1, 1, ?, ?)', [randomDate.format('YYYY-MM-DD'), randomDate.format('YYYY-MM-DD')]);

      }
    },

    getWeeks: (times, cb) => {
      var weeks = [];
      var segmentedTimeSheet = [];
      var n_weeks = 6;
      var lookBack = 28; // number of days to look back
      nominalWeeks = [];
      // times ordered by clock_in 

      // get last input 
      // get the date that is six weeks before that date
      // segment by mondays

      var endDate = moment(times[times.length-1].clock_in); // last date (ordered by date)
      var startDate = moment(endDate).subtract(lookBack, 'd'); // subtract 28 to get day 4 weeks before


      var i;

      for ( i = 0; i < times.length-1 ; i++){
        currentTime = moment(times[i].clock_in);
        if (currentTime.isAfter(startDate) ){
            break;
        }
      }

      var startIndex = i-1; // represents the first day in the past lookBack days range




    
      // this function needs to be redone
      var weekEnd = moment(times[startIndex]).isoWeekday(7); // use 7 to start on sunday
     
      var weekStart = weekEnd.clone();
      weekStart.subtract(7,'d');

      var segmentIndex = times.length-1;

      for (var i = 0; i < lookBack/7; i++){

        weeks[i] = [];
        var weekHasData = false; 


        while (segmentIndex > startIndex ){
       
          var currentTime = moment(times[segmentIndex].clock_in);
          if(currentTime.isAfter(weekStart)){

            weeks[i].push(times[segmentIndex]);
            segmentIndex--;
            weekHasData = true;
          } else {
            // current time is before the week start.
            break;

          }
        }

        if (weekHasData){
          var weekNumber = (lookBack/7) - i // inverted
          var weekString;
          var weekObject;
          if (weekNumber == 4){
            weekString = "Week " + weekNumber + " (last entered week)";
            weekObject = {};
            weekObject.id = i;
            weekObject.name = weekString
            nominalWeeks.push(weekObject);
          } else {
            weekString = "Week " + weekNumber;
            weekObject = {};
            weekObject.id = i;
            weekObject.name = weekString
            nominalWeeks.push(weekObject);
          }
          
        }

        weekEnd.subtract(7, 'd');
        weekStart.subtract(7, 'd');



       }


      cachedNominalWeeks = nominalWeeks;

      cachedWeeks = weeks;
     
       cb(nominalWeeks);
    },

    getCachedWeeks: (cb)=>{

      cb(nominalWeeks);
    }


    


 

}
