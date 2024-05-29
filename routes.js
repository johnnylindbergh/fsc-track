
/*
  routes.js: System routes for most requests
*/
"use strict";
const db    = require('./database.js');
const sys   = require('./settings.js');
const mid   = require('./middleware.js');
const moment = require('moment');
const schedule = require('node-schedule');
const fs = require('fs');


const job = schedule.scheduleJob('* 59 23 * *', function(){
    db.clockOutAll(function(err){
       console.log('All users have been automatically clocked out at: ', new Date.toLocaleTimeString());
    });
});

module.exports = function(app) {

  app.get('/admin', mid.isAuth, (req, res) => {

    if (req.isAuthenticated() && req.user && req.user.local) {
      if (req.user.local.user_type == 1) {

        var render = defaultAdminRender(req);
        db.getJobs(req, res, function (err, jobs){
          render.jobs = jobs;
          db.getTasks(req, res, function(err, tasks){
            render.tasks = tasks;
            db.getWholeTimesheet(req, res, function(times){
                render.times = times;
                //console.log(times);
                db.getWeeks(times, function(nominalWeeks){
                  render.nominalWeeks = nominalWeeks;
                  db.getUsers(function(err, users){
                    render.users = users;
                   // console.log("Users: ",users);
                    db. getUsersHours(function(err, userHours){
                      
                      //console.log("Timesheet Error:",err);

                      render.times= userHours;

                      db.getInventory(function(err, inventory){
                        //console.log("inventory error:", err);
                        render.inventory = inventory;
                        res.render("admin.html", render);
                      });

                    });
               

                  });

                });


            });

          });

        });      

      } else {
	 var params = [];
	params.fr = "You are not an admin."
         res.err(params)
      }

      } else {

        res.render("/");
      
      }
  });
  
  app.get('/getTimesheet', mid.isAuth, (req, res) =>{
    db.getTimesheet(req, res, function(err, times){
      // must process first
      res.send(times);
    });

  });
  app.post('/admin', mid.isAuth, (req, res) => {

    if (req.isAuthenticated() && req.user && req.user.local) {
      if (req.user.local.user_type == 1) {

        var render = defaultAdminRender(req);
        db.getJobs(req, res, function (err, jobs){

          render.jobs = jobs;
          db.getTasks(req, res, function(err, tasks){

            render.tasks = tasks;
            db.getTimesheet(req, res, function(err, times){

                render.times = times;

                db.getWholeTimesheet(req, res, function(times){
                  db.getWeeks(times, function(nominalWeeks){

                    render.nominalWeeks = nominalWeeks;
                  db.getUsers(function(err, users){
                  render.users = users;

                  db. getUsersHours(function(err, userHours){
                    render.times= userHours;

                    db.getInventory(function(err, inventory){
                      render.inventory = inventory;

                      // now filter
                      for (var i = 0; i < render.users.length; i++){
                        if (render.users[i].id == req.body.userId){
                          render.users[i].selected = true;
                        }
x                      }
              
                      for (var i = 0; i < render.jobs.length; i++){
                        if (render.jobs[i].id == req.body.jobId){

                          render.jobs[i].selected = true;
                        }
                      }
                        for (var i = 0; i < render.tasks.length; i++){
                        if (render.tasks[i].id == req.body.taskId){

                          render.tasks[i].selected = true;
                        }
                      }

              
                      // parse dates from request into moment objects
                      var startDate = moment(req.body.startDate);
                      var endDate = moment(req.body.endDate);

                      if (req.body.weekId == -1){
                        req.body.weekId = null;
                      }

                      if (req.body.userId == -1){
                        req.body.userId = null;
                      }
                      
                      if (req.body.jobId == -1){
                        req.body.jobId = null;
                      }
                      
                      if (req.body.taskId == -1){
                        req.body.taskId = null;
                      }

                      db.getTimesheetQuery(req, res, startDate, endDate, req.body.userId, req.body.jobId, req.body.taskId, req.body.weekId,  function(err,rows){
                        if (!err && rows.length > 0){
                          console.log(rows);
                          render.results = rows;
                        }

                        render.startDate = startDate;
                        render.endDate = endDate;
                        //render.nominalWeeks = db.nominalWeeks;
                        render.searchScroll = true;




                        res.render("admin.html", render);
                      }); 

           
                    });


                  });
             

                });
                  
                 });

                });



                

            });

          });

        });      

      } else {

         res.send("You are not an admin.")
      }

      } else {

        res.render("/");
      
      }
  });

  
  app.get('/qrGen/:jobId/', mid.isAuth, (req, res) => {
    var render = defaultRender(req);
    var jobId = req.params.jobId;

    if (req.isAuthenticated() && req.user && req.user.local) {
      db.getJobs(req,res, function (err, jobs){
        render.jobs = jobs;
        db.getJobName(jobId, function (err, name){
          render.jobName = name;
          db.getTasks(req, res, function (err, tasks){
            render.domain = sys.DOMAIN;
            render.tasks = tasks
            // create job - task pair
            render.jobTasks = [];

            for (var j = 0; j < tasks.length; j++){
              var jobTaskPair = {job:jobId, task:tasks[j]};
              render.jobTasks.push(jobTaskPair)
            }
            
            res.render('qr.html', render);
          });
        });
      });
    }
  });


   app.get('/qr/:jobId/:taskId/', mid.isAuth, (req, res) => {
    var render = defaultRender(req);
    if (req.isAuthenticated() && req.user && req.user.local) {
      db.clockInAndOut(req.user.local.id, req.params.jobId, req.params.taskId, function(err){
        if (!err){
          res.redirect('/');
        } else {
          res.send(err);
        }
      });
    }

   });

  

  app.get('/', mid.isAuth, (req, res) => {
    var render = defaultRender(req);

    if (req.isAuthenticated() && req.user && req.user.local) {


      if (req.user.local.user_type == 1 || req.user.local.user_type ==2 || req.user.local.user_type ==3){

  
          var userEmail = req.user.local.email;
          var userId = req.user.local.id;
          db.getJobs(req, res, function (err, jobs){

            render.jobs = jobs;
            db.getTasks(req, res, function (err, tasks){


               render.tasks = tasks;
               db.lookUpUser(userEmail, function(err, user){
                  console.log("User GET / : ",user.name);
                  render.clockedIn = user.clockedIn;
                  //res.send(render)
                  render.clockedIn = user.clockedIn;
            
                    db.getClockInDuration(req.user.local.id, function (err, row){
                      if (!err && err == null){
                          render.clock_in = row[0].clock_in;
                      }
                    
                      res.render("main.html", render);
                    });
             

                    

                  
              });
            });
          });
      }
    } else {
       res.render("welcome.html", render);
    }
  });

//app.post("clockIn")


  app.get('/clockInDuration', mid.isAuth, (req, res) => {
     if (req.isAuthenticated() && req.user && req.user.local){

      db.getClockInDuration(req.user.local.id, function(clockInDuration){
          res.send(clockInDuration);
      });

     }

  });


app.post('/addJob',mid.isAuth, function (req, res){
        // start with default render object
        var render = defaultRender(req);
        // ensure given name exists
        if (req.body.jobName) {
                // create new job entry in DB
                db.createJob(req.body.jobName, function(err) {
                  res.redirect('/admin');

                });
        } else {
                res.send(err);
        }
});

app.post('/addTask',mid.isAuth, function (req, res){
        // start with default render object
        var render = defaultRender(req);
        // ensure given name exists
        if (req.body.taskName) {
                // create new job entry in DB
                db.createTask(req.body.taskName, function(err) {
                  res.redirect('/admin');

                });
        } else {
        }
});


app.post('/clockIn', mid.isAuth, function(req, res){
  var job = req.body.jobName;
  var task = req.body.taskName;
  var userId = req.user.local.id;
  db.clockIn(userId, job, task, function(err){ // this function now must add the clock_in time to the user table
    if (!err){
      res.redirect('/');
    } else {
      res.send(err);
    }
  });

});

app.post('/deleteJob', mid.isAuth, function(req, res){
  var job = req.body.jobName;
  var userId = req.user.local.id;
  db.deleteJob(job, function(err){
    if (!err){
      res.redirect('/admin');
    } else {
      res.send(err);
    }
  });

});

app.post('/deleteTask', mid.isAuth, function(req, res){
  var task = req.body.taskName;
  var userId = req.user.local.id;
  db.deleteTask(task, function(err){
    if (!err){
      res.redirect('/admin');
    } else {
      res.send(err);
    }
  });

});

app.post('/clockOut', mid.isAuth, function(req, res){

  db.clockOut(req, function(err){ // this function must update the user table to set clockedIn to false and set the clock_in time to null (this shouldn't really search timesheet)
    if (!err){
      res.redirect('/');
    } else {
      res.send(err);
    }
  });
  
});

app.post('/searchTimesheet', mid.isAuth, function(req, res){

   if (req.isAuthenticated() && req.user && req.user.local) {

      if (req.user.local.user_type == 1) {


        var render = defaultRender(req);
        db.updateAllDurations();

        db.getCachedWeeks(function(err, getCachedWeeks){

          render.weeks = getCachedWeeks;
          db.getJobs(req, res, function (err, jobs){

          render.jobs = jobs;
          db.getTasks(req, res, function(err, tasks){

            render.tasks = tasks;
            db.getUsers( function(err, rows){
              render.users = rows;

              for (var i = 0; i < render.weeks.length; i++){
                if (render.weeks[i].id == req.body.weekId){
                  render.weeks[i].selected = true;
                }
              }

              for (var i = 0; i < render.users.length; i++){
                if (render.users[i].id == req.body.userId){
                  render.users[i].selected = true;
                }
              }
              
              for (var i = 0; i < render.jobs.length; i++){
                if (render.jobs[i].id == req.body.jobId){

                  render.jobs[i].selected = true;
                }
              }
                for (var i = 0; i < render.tasks.length; i++){
                if (render.tasks[i].id == req.body.taskId){

                  render.tasks[i].selected = true;
                }
              }

              
              // parse dates from request into moment objects
              var startDate = moment(req.body.startDate);
              var endDate = moment(req.body.endDate);

              if (req.body.userId == -1){
                req.body.userId = null;
              }
              
              if (req.body.jobId == -1){
                req.body.jobId = null;
              }
              
              if (req.body.taskId == -1){
                            req.body.taskId = null;
              }

              db.getTimesheetQuery(req, res, startDate, endDate, req.body.userId, req.body.jobId, req.body.taskId, req.body.weekId,  function(err,rows){

                if (!err && rows.length > 0){
                  render.results = rows;
                }

                render.startDate = startDate;
                render.endDate = endDate;



                res.render("timesheet.html", render);
              }); 

            });

          });

        }); 

        });
     

      } else {

         res.send("You are not an admin.")
      }

      } else {

        res.render("/");
      
      }

 });


app.post('/searchTimesheetToCSV', mid.isAuth, function(req, res){

   if (req.isAuthenticated() && req.user && req.user.local) {

      if (req.user.local.user_type == 1) {


        var render = defaultRender(req);
        db.updateAllDurations();
        db.getJobs(req, res, function (err, jobs){

          render.jobs = jobs;
          db.getTasks(req, res, function(err, tasks){

            render.tasks = tasks;
            db.getUsers( function(err, rows){
              render.users = rows;

              for (var i = 0; i < render.users.length; i++){
                if (render.users[i].id == req.body.userId){
                  render.users[i].selected = true;
                }
              }
              
              for (var i = 0; i < render.jobs.length; i++){
                if (render.jobs[i].id == req.body.jobId){

                  render.jobs[i].selected = true;
                }
              }
                for (var i = 0; i < render.tasks.length; i++){
                if (render.tasks[i].id == req.body.taskId){

                  render.tasks[i].selected = true;
                }
              }

              
              // parse dates from request into moment objects
              var startDate = moment(req.body.startDate);
              var endDate = moment(req.body.endDate);

              if (req.body.userId == -1){
                req.body.userId = null;
              }
              
              if (req.body.jobId == -1){
                req.body.jobId = null;
              }
              
              if (req.body.taskId == -1){
                req.body.taskId = null;
              }


              if (req.body.weekId == -1){
                req.body.weekId = null;
              }

              db.getTimesheetQuery(req, res, startDate, endDate, req.body.userId, req.body.jobId, req.body.taskId, req.body.weekId,  function(err, timesheetData){

                if (!err && timesheetData.length > 0){
                  render.startDate = startDate;
                  render.endDate = endDate;
                  render.results = timesheetData;
                  console.log(rows);
                  fs.writeFile('timesheet.csv', arrayToCSV(timesheetData), function(){
                    res.download('timesheet.csv');
                  });
                } else {
                  console.log(error);
                }

              

                
            
              }); 

            });

          });

        });      

      } else {

         res.send("You are not an admin.")
      }

      } else {

        res.render("/");
      
      }

 });
// updates inventory quantity 
  app.post('/updateInventoryItem',  mid.isAuth, function(req, res){
      if (req.user.local && req.user.local.user_type == 3){
        //console.log(req.body.item)
        // must handle items like [ '3', '4' ] [ '1', '2' ] (quantity1, quatity2,) for (itemId1, itemId2)

        db.updateInventoryQuantity(req, res, function(err){
          if (!err){
            res.redirect('/#inventory')
          } else {
            res.send("An error has occured in /updateInventoryItem");
          }
          
        });
      } else {
        res.send("You are not a manger.")
      }
  });

  app.post('/addInventoryItem', mid.isAuth, function(req, res){
    if (req.user.local && req.user.local.user_type == 1){
      

        db.newInventoryItem(req.body.itemName, req.body.quantity, function(err){
          res.redirect("/admin");
        });

      }
  });

  app.post('/updateUser/',  mid.isAuth, function(req, res){
      if (req.user.local && req.user.local.user_type == 1){
        if (req.user.local.user_type == 1) {
        

          db.updateUser(req, res, function(err){
            res.redirect("/admin");
          });

        }
      }
  }); 

   app.get('/modifyUser/:id',  mid.isAuth, function(req, res){
      if (req.user.local && req.user.local.user_type == 1){

        if (req.user.local.user_type == 1) {
          var userId = req.params.id;
          var render = defaultAdminRender(req);
          db.getUser(userId, function(user){
            render.user = user;
            //console.log( render.user);
            res.render('modifyUser.html', render);
          });    
        }

      }
  }); 

  app.post('/updateInventory', mid.isAuth, function(req,res){
      if (req.user.local && req.user.local.user_type == 1){
        for (var i = 0; i < req.body.id.length; i++){

          if (req.body.reorder && req.body.reorder[i]){
            //console.log(req.body.reorder[i]);
          }
          //console.log(req.body.id[i]);
        }
        //console.log(req.body);


        db.updateInventory(req.body, function(err){
          res.redirect("/admin");
        });
      }
  });
}

function arrayToCSV(objArray) {
     const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
     let str = `${Object.keys(array[0]).map(value => `"${value}"`).join(",")}` + '\r\n';

     return array.reduce((str, next) => {
         str += `${Object.values(next).map(value => `"${value}"`).join(",")}` + '\r\n';
         return str;
        }, str);
 }



function defaultRender(req) {
  if (req.isAuthenticated() && req.user && req.user.local) {
    // basic render object for fully authenticated user
    return {
      inDevMode: sys.DEV_MODE,
      auth: {
        isAuthenticated: true,
        userIsAdmin: req.user.local.isAdmin,
        message: "Welcome,  " + req.user.name.givenName + "!"
      },
      defaults:{
        sysName:sys.SYSTEM_NAME
      }
    };
  } else {
    // default welcome message for unauthenticated user
    return {
      inDevMode: sys.inDevMode,
      auth: {
        message: "Welcome! Please log in."
      }
    };
  }
}

function defaultAdminRender(req) {
  if (req.isAuthenticated() && req.user && req.user.local) {
    // basic render object for fully authenticated user
    return {
      inDevMode: sys.DEV_MODE,
      auth: {
        isAuthenticated: true,
        userIsAdmin: req.user.local.isAdmin,
        message: "Welcome,  " + req.user.name.givenName + "!"
      },
      defaults:{
        sysName:sys.SYSTEM_NAME,
        domain:sys.DOMAIN
      }
    };
  } else {
    // default welcome message for unauthenticated user
    return {
      inDevMode: sys.inDevMode,
      auth: {
        message: "Welcome! Please log in."
      }
    };
  }
}
