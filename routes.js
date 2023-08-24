
/*
  routes.js: System routes for most requests
*/

const db    = require('./database.js');
const sys   = require('./settings.js');
const mid   = require('./middleware.js');

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
              res.render("admin.html", render);

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

  
  app.get('/qr', mid.isAuth, (req, res) => {
    var render = defaultRender(req);
    if (req.isAuthenticated() && req.user && req.user.local) {
      db.getJobs(req, res, function (err, jobs){
        render.jobs = jobs;
        db.getTasks(req, res, function (err, tasks){
          render.domain = sys.DOMAIN;
          render.tasks = tasks
          // create job - task pair
          render.jobTasks = [];
          for (var i = 0; i < jobs.length; i++){
             for (var j = 0; j < tasks.length; j++){
              var jobTaskPair = {job:jobs[i], task:tasks[j]};
              render.jobTasks.push(jobTaskPair)
            }
          }
          res.render('qr.html', render);
        });
      });
    }
  });

   app.get('/qr/:jobId/:taskId', mid.isAuth, (req, res) => {
    var render = defaultRender(req);
    if (req.isAuthenticated() && req.user && req.user.local) {
      console.log(req.user.local.id, req.params.jobId, req.params.taskId);
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
                  //console.log(render);
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
        //console.log(req.body.jobName);
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


//    console.log(req._json);
 //   db.getJobs(req, res, function (err, rows){
//      console.log(rows);
 //     res.render("sample.html",{jobs:rows});
 //   });

  /*
    ************************************
    *                                  *
    *   Routes go here...              *
    *                                  *
    *   app.get('/', (req, res) => {   *
    *     ...                          *
    *   });                    
app.get('/getRAlocationStats', (req, res) => {
   // renderMessages(req,res)
   db.getRAlocationStats(req, res, function (loc){
      console.log(loc);
      res.render('locations.html', {locations:loc});
   });


});        *
    *                                  *
    ************************************
  */

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
