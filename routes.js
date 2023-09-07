
/*
  routes.js: System routes for most requests
*/

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

        var render = defaultRender(req);
        db.getJobs(req, res, function (err, jobs){

          render.jobs = jobs;
          db.getTasks(req, res, function(err, tasks){

            render.tasks = tasks;
            db.getTimesheet(req, res, function(err, times){

                render.times = times;
                db.getUsers(function(err, users){
                  render.users = users;

                  res.render("admin.html", render);
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
          console.log(name);
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


     // if (req.user.local.user_type == 1 || req.user.local.user_type ==2){

  
          var userEmail = req.user.local.email;
          var userId = req.user.local.id;
          db.getJobs(req, res, function (err, jobs){

            render.jobs = jobs;
            db.getTasks(req, res, function (err, tasks){

               render.tasks = tasks;
               db.lookUpUser(userEmail, function(err, rows){

                  render.clockedIn = rows.clockedIn;
                  //res.send(render)
                  res.render("main.html", render);
              });
            });
          });
     // }
    } else {
       res.render("welcome.html", render);
    }
  });

//app.post("clockIn")


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
  db.clockIn(userId, job, task, function(err){
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
  var job = req.body.jobName;
  var task = req.body.taskName;
  var userId = req.user.local.id;
  db.clockOut(userId, function(err){
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

              db.getTimesheetQuery(req, res, startDate, endDate, req.body.userId, req.body.jobId, req.body.taskId,  function(err,rows){
                if (!err && rows.length > 0){
                  render.results = rows;
                }

                render.startDate = startDate;
                render.endDate = endDate;



                res.render("admin.html", render);
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

              db.getTimesheetQuery(req, res, startDate, endDate, req.body.userId, req.body.jobId, req.body.taskId,  function(err,rows){
                if (!err && rows.length > 0){
                  render.results = rows;
                }

                render.startDate = startDate;
                render.endDate = endDate;

                
		fs.writeFile('timesheet.csv',arrayToCSV(rows), function(){
			res.download('timesheet.csv');
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
