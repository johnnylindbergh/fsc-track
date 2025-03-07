
/*
  routes.js: System routes for most requests
*/
"use strict";
const db = require('./database.js');
const sys = require('./settings.js');
const mid = require('./middleware.js');
const moment = require('moment');
const schedule = require('node-schedule');
const fs = require('fs');
const { GOOGLE_CLIENT_ID } = require('./credentials.js');
const credentials = require('./credentials.js');

const axios = require('axios').default;


const xlsx = require('xlsx');

function convertArrayToXLSX(array, cb) {
  const ws = xlsx.utils.json_to_sheet(array);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

  // append fomulae
  // xlsx.utils.sheet_add_aoa(ws, [['=SUM(E1:E3)']], {origin: -1});
  // xlsx.utils.sheet_add_aoa(ws, [['=SUM(A1:A3)']], {origin: -1});
  // xlsx.utils.sheet_add_aoa(ws, [['=MAX(A1:A3)']], {origin: -1});
  //  xlsx.utils.sheet_add_aoa(ws, [['=MIN(A1:A3)']], {origin: -1});
  // for each row, set col E to be a formula that calculates the duration

  for (var i = 0; i < array.length; i++) {
    var row = i + 2;
    var formula = 'D' + row + '-C' + row;
    xlsx.utils.sheet_add_aoa(ws, [[{ t: 'n', f: formula }]], { origin: 'E' + row });
  }

  // append sum of row E
  var lastRow = array.length + 2;
  xlsx.utils.sheet_add_aoa(ws, [[{ t: 'n', f: 'SUM(E2:E' + (lastRow - 1) + ')' }]], { origin: 'E' + lastRow });



  const buffer = xlsx.write(wb, { type: 'buffer' });
  fs.writeFile('timesheet.xlsx', buffer, (err) => {
    if (err) {
      return cb(err);
    }
    cb(null);
  });
}

var bouncieAccessToken = null;

const job = schedule.scheduleJob('0 0 * * *', function () {
  db.clockOutAll(function (err) {
    console.log("It is now midnight, all users have been clocked out.");
  });
});

module.exports = function (app) {
  // GET requests
  app.get('/admin', mid.isAuth, (req, res) => {

    if (req.isAuthenticated() && req.user && req.user.local) {
      if (req.user.local.user_type == 1) {

        var render = defaultAdminRender(req);
        db.getJobs(req, res, function (err, jobs) {
          render.jobs = jobs;
          db.getTasks(req, res, function (err, tasks) {
            render.tasks = tasks;
            db.getWholeTimesheet(req, res, function (times) {
              render.times = times;
              //console.log(times);
              db.getWeeks(times, function (nominalWeeks) {
                render.nominalWeeks = nominalWeeks;
                db.getUsers(function (err, users) {
                  render.users = users;
                  // console.log("Users: ",users);
                  db.getUsersHours(function (err, userHours) {

                    //console.log("Timesheet Error:",err);

                    render.times = userHours;

                    db.getInventory(function (err, inventory) {
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
        params.fr = "You are not an admin"
        res.err(params)
      }

    } else {

      res.render("/");

    }
  });

  app.get('/getTimesheet', mid.isAuth, (req, res) => {
    db.getTimesheet(req, res, function (err, times) {
      // must process first
      res.send(times);
    });

  });
  app.post('/admin', mid.isAuth, (req, res) => {

    if (req.isAuthenticated() && req.user && req.user.local) {
      if (req.user.local.user_type == 1) {

        var render = defaultAdminRender(req);
        db.getJobs(req, res, function (err, jobs) {

          render.jobs = jobs;
          db.getTasks(req, res, function (err, tasks) {

            render.tasks = tasks;
            db.getTimesheet(req, res, function (err, times) {

              render.times = times;

              db.getWholeTimesheet(req, res, function (times) {
                db.getWeeks(times, function (nominalWeeks) {

                  render.nominalWeeks = nominalWeeks;
                  db.getUsers(function (err, users) {
                    render.users = users;

                    db.getUsersHours(function (err, userHours) {
                      render.times = userHours;

                      db.getInventory(function (err, inventory) {
                        render.inventory = inventory;

                        // now filter
                        for (var i = 0; i < render.users.length; i++) {
                          if (render.users[i].id == req.body.userId) {
                            render.users[i].selected = true;
                          }
                        }

                        for (var i = 0; i < render.jobs.length; i++) {
                          if (render.jobs[i].id == req.body.jobId) {

                            render.jobs[i].selected = true;
                          }
                        }
                        for (var i = 0; i < render.tasks.length; i++) {
                          if (render.tasks[i].id == req.body.taskId) {

                            render.tasks[i].selected = true;
                          }
                        }


                        // parse dates from request into moment objects
                        var startDate = moment(req.body.startDate);
                        var endDate = moment(req.body.endDate);

                        if (req.body.weekId == -1) {
                          req.body.weekId = null;
                        }

                        if (req.body.userId == -1) {
                          req.body.userId = null;
                        }

                        if (req.body.jobId == -1) {
                          req.body.jobId = null;
                        }

                        if (req.body.taskId == -1) {
                          req.body.taskId = null;
                        }

                        db.getTimesheetQuery(req, res, startDate, endDate, req.body.userId, req.body.jobId, req.body.taskId, req.body.weekId, function (err, rows) {
                          if (!err && rows.length > 0) {
                            //console.log(rows);
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

        var params = [];
        params.fr = "You are not an admin."
        res.err(params)
      }

    } else {

      res.render("/");

    }
  });

  // bouncie oauth
  app.get('/bouncie', mid.isAuth, (req, res) => {
    var url = 'https://auth.bouncie.com/dialog/authorize?client_id=' + 'fsc-track' + '&redirect_uri=' + credentials.domain + '/bouncie/callback&response_type=code';
    console.log(url);
    res.redirect(url);

  });

  // bouncie oauth callback
  app.get('/bouncie/callback', mid.isAuth, (req, res) => {
    var code = req.query.code;
    var state = req.query.state;
    var url = 'https://auth.bouncie.com/oauth/token';
    var data = {
      grant_type: 'authorization_code',
      code: code,
      client_id: 'fsc-track',
      client_secret: credentials.bouncie_client_secret,
      redirect_uri: credentials.domain + '/bouncie/callback'
    };

    const axios = require('axios').default;

    const options = {
      method: 'POST',
      url: url,
      headers: { 'Content-Type': 'application/json' },
      data: data
    };

    axios.request(options).then(function (response) {
      console.log(response.data);
      // save the access token in req.user.local.bouncie_access_token
      bouncieAccessToken = response.data.access_token;
      res.redirect('/location');

    }).catch(function (error) {
      console.error(error);
    });

  });

  app.get('/location', mid.isAuth, async (req, res) => {
    // make json req to get query location history from bouncie
    // use the url in credentials.js
    //https://api.bouncie.dev/v1/vehicles
    // use the api key in credentials.js
    // get vehicle id from req
    // get start and end time from req
    // return json

    // if the access token is null, redirect to /bouncie
    if (bouncieAccessToken == null) {
      res.redirect('/bouncie');
    }

    // var vehicleId = req.query.vehicleId;
    // var startTime = req.query.startTime;
    // var endTime = req.query.endTime;

    // use test data for now
    var vehicleId = "1";
    var startTime = "2021-12-14T00:00:00Z";
    var endTime = "2024-12-16T00:00:00Z";
    var imei = '862255068921813';

    // imei string Unique bouncie device identifier
    // limit number Number of search results to limit (for paging)> 0 
    // skip number Number of search results to skip (for paging) > 0
    // vin string Vehicle Identification Number for vehicle


    // make get request to bouncie  

    const axios = require('axios').default;


    console.log(bouncieAccessToken);


    const options = {
      method: 'GET',
      url: 'https://api.bouncie.dev/v1/vehicles',
      params: { imei: imei, limit: 1 },
      headers: { Authorization: bouncieAccessToken, 'Content-Type': '', Accept: 'application/json' }
    };

    try {
      const { data } = await axios.request(options);
      console.log(data);
      res.send(data);
    } catch (error) {
      console.error(error);
    }

  });

  app.get('/qrGen/:jobId/', mid.isAuth, (req, res) => {
    var render = defaultRender(req);
    var jobId = req.params.jobId;

    if (req.isAuthenticated() && req.user && req.user.local) {
      db.getJobs(req, res, function (err, jobs) {
        render.jobs = jobs;
        db.getJobName(jobId, function (err, name) {
          render.jobName = name;
          db.getTasks(req, res, function (err, tasks) {
            render.domain = sys.DOMAIN;
            render.tasks = tasks
            // create job - task pair
            render.jobTasks = [];

            for (var j = 0; j < tasks.length; j++) {
              var jobTaskPair = { job: jobId, task: tasks[j] };
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
      db.clockInAndOut(req.user.local.id, req.params.jobId, req.params.taskId, function (err) {
        if (!err) {
          res.redirect('/');
        } else {
          var params = [];
          params.fr = err
          res.err(params)
        }
      });
    }

  });



  app.get('/', mid.isAuth, (req, res) => {
    var render = defaultRender(req);

    if (req.isAuthenticated() && req.user && req.user.local) {


      if (req.user.local.user_type == 1 || req.user.local.user_type == 2 || req.user.local.user_type == 3) {


        var userEmail = req.user.local.email;
        var userId = req.user.local.id;
        db.getJobs(req, res, function (err, jobs) {

          render.jobs = jobs;
          db.getTasks(req, res, function (err, tasks) {


            render.tasks = tasks;
            db.lookUpUser(userEmail, function (err, user) {
              render.isAdmin = (req.user.local.user_type == 1);
              console.log("User GET / :", user.name);
              //console.log("adminStatus", render.isAdmin )
              render.clockedIn = user.clockedIn;
              //res.send(render)
              render.clockedIn = user.clockedIn;

              db.getClockInDuration(req.user.local.id, function (err, row) {
                if (!err && err == null) {
                  render.clock_in = row[0].clock_in;
                }
                render.googleMapsApiKey = credentials.googleMapsApiKey;
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

  app.post('/location', mid.isAuth, (req, res) => {
    console.log(req.user.name.givenName + " is located at: ", req.body.address, " at ", req.body.latitude + "," + req.body.longitude, moment().calendar()); // use system time
    console.log("Location Delta: ", req.body.locationDelta);
    if (req.isAuthenticated() && req.user && req.user.local) {
      res.send("Location updated");
      // db.updateLocation(req, function (err) {
      //   if (!err) {
      //     res.send("Location updated");
      //   } else {
      //     res.send(err);
      //   }
      // });
    }
  });


  app.get('/clockInDuration', mid.isAuth, (req, res) => {
    if (req.isAuthenticated() && req.user && req.user.local) {

      db.getClockInDuration(req.user.local.id, function (clockInDuration) {
        res.send(clockInDuration);
      });

    }

  });

  app.get('/getUserHours', mid.isAuth, (req, res) => {

    if (req.isAuthenticated() && req.user && req.user.local) {
      db.getUserHours(req.user.local.id, function (err, rows) {
        res.send(rows);
      });
    }

  });


  app.get('/hours', mid.isAuth, (req, res) => {
    if (req.isAuthenticated() && req.user && req.user.local) {
      var render = defaultRender(req);

      db.getUserHours(req.user.local.id, function (err, rows) {
        if (!err) {

          // for each row, format the time
          for (var i = 0; i < rows.length; i++) {
            rows[i].clock_in = moment(rows[i].clock_in).format("MMMM Do, YYYY h:mm:ss a");
          }
          render.hours = rows;
          //console.log(rows);
          res.render("hours.html", render);
        } else {
          console.log(err);
        }

      });

    }

  });


  app.post('/addJob', mid.isAuth, function (req, res) {
    // start with default render object
    var render = defaultRender(req);
    // ensure given name exists
    if (req.body.jobName) {
      // create new job entry in DB
      db.createJob(req.body.jobName, function (err) {
        res.redirect('/admin');

      });
    } else {
      res.send(err);
    }
  });

  app.post('/addTask', mid.isAuth, function (req, res) {
    // start with default render object
    var render = defaultRender(req);
    // ensure given name exists
    if (req.body.taskName) {
      // create new job entry in DB
      db.createTask(req.body.taskName, function (err) {
        res.redirect('/admin');

      });
    } else {
    }
  });


  app.post('/clockIn', mid.isAuth, function (req, res) {
    var userId = req.user.local.id;

    // get the address from the request
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.render('error.html', { friendly: "Location services are required.", link: "/", linkTitle: "Return to homepage" });
    }


    // use the google maps api to get the address from the lat and long
    // https://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&key=YOUR_API_KEY

    let address = null;

    const options = {
      method: 'GET',
      url: 'https://maps.googleapis.com/maps/api/geocode/json',
      params: { latlng: latitude + ',' + longitude, key: credentials.googleMapsApiKey }
    };

    axios.request(options).then(function (response) {
      if (response.data && response.data.results && response.data.results.length > 0) {
        address = response.data.results[0].formatted_address;
        db.clockIn(userId, address, function (err) {
          if (!err) {
            res.redirect('/');
          } else {
            res.render('error.html', { friendly: err, link: "/" });
          }
        });
      } else {
        res.render('error.html', { friendly: "Unable to retrieve address from coordinates.", link: "/" });
      }
    }).catch(function (error) {
      console.error(error);
      res.render('error.html', { friendly: "Error retrieving address from coordinates.", link: "/" });
    });
  });

  // app.post('/clockIn', mid.isAuth, function (req, res) {
  //   var job = req.body.jobName;
  //   var task = req.body.taskName;
  //   var userId = req.user.local.id;
  //   db.clockIn(userId, job, task, function (err) { // this function now must add the clock_in time to the user table
  //     if (!err) {
  //       res.redirect('/');
  //     } else {
  //       res.send(err);
  //     }
  //   });

  // });

  app.post('/deleteJob', mid.isAuth, function (req, res) {
    var job = req.body.jobName;
    var userId = req.user.local.id;
    db.deleteJob(job, function (err) {
      if (!err) {
        res.redirect('/admin');
      } else {
        res.send(err);
      }
    });

  });

  app.post('/deleteTask', mid.isAuth, function (req, res) {
    var task = req.body.taskName;
    var userId = req.user.local.id;
    db.deleteTask(task, function (err) {
      if (!err) {
        res.redirect('/admin');
      } else {
        res.send(err);
      }
    });

  });

  app.post('/clockOut', mid.isAuth, function (req, res) {
    if (req.isAuthenticated() && req.user && req.user.local) {
      if (req.body.jobName && req.body.taskName) {
        db.clockOut(req, function (err) { // this function must update the user table to set clockedIn to false and set the clock_in time to null (this shouldn't really search timesheet)
          if (!err) {
            // check user
            // does user have an imei in the db?
            // if so, query bouncie for location history between clock in and clock out for a vehicle with that imei
            // process the location history and sumarize it into a set of top location points like short addresses with their associated durations ex. "1234 Main St. 2 hours"
            // insert the location history into the db
            // insert the summarized location history into the db
            // if not
            res.redirect('/');
          } else {
            res.send(err);
          }
        });
      } else {
        res.render('error.html', { friendly: "You must select a job and task to clock out.", link: "/" });
      }
    } else {
      res.redirect('/');
    }

  });

  app.post('/default_url_when_press_enter', mid.isAuth, function (req, res) {
    res.err({
      fr: "You pressed enter",
      li: "/admin",
      ti: "Please choose a valid option: download or display"
    });
  });

  app.post('/searchTimesheet', mid.isAuth, function (req, res) {
    console.log("/searchTimesheet", req.body);

    if (req.isAuthenticated() && req.user && req.user.local) {

      if (req.user.local.user_type == 1) {

        var render = defaultRender(req);

        db.getCachedWeeks(function (err, getCachedWeeks) {

          render.weeks = getCachedWeeks;
          db.getJobs(req, res, function (err, jobs) {

            render.jobs = jobs;
            db.getTasks(req, res, function (err, tasks) {

              render.tasks = tasks;
              db.getUsers(function (err, rows) {
                render.users = rows;

                let selectedUsers = [];
                // parse the ints in req.body.userId
                if (req.body.userId) {
  
                  // check if userId is an array
                  if (!Array.isArray(req.body.userId)) {
                    req.body.userId = [req.body.userId];
                  }
                  
                  for (var i = 0; i < req.body.userId.length; i++) {
                    selectedUsers.push(parseInt(req.body.userId[i]));
  
                  }
  
                  for (var i = 0; i < render.users.length; i++) {
                    if (selectedUsers.includes(render.users[i].id)) {
                      render.users[i].selected = true;
                    }
                  }
                } 

                for (var i = 0; i < render.weeks.length; i++) {
                  if (render.weeks[i].id == req.body.weekId) {
                    render.weeks[i].selected = true;
                  }
                }


                for (var i = 0; i < render.users.length; i++) {
                  if (render.users[i].id == req.body.userId) {
                    render.users[i].selected = true;
                  }
                }

                for (var i = 0; i < render.jobs.length; i++) {
                  if (render.jobs[i].id == req.body.jobId) {

                    render.jobs[i].selected = true;
                  }
                }
                for (var i = 0; i < render.tasks.length; i++) {
                  if (render.tasks[i].id == req.body.taskId) {

                    render.tasks[i].selected = true;
                  }
                }


                // parse dates from request into moment objects
                var startDate = moment(req.body.startDate);
                var endDate = moment(req.body.endDate);


                console.log("Users selected: ", req.body.userId);
                if (req.body.userId == -1) {
                  req.body.userId = null;
                }

                if (req.body.jobId == -1) {
                  req.body.jobId = null;
                }

                if (req.body.taskId == -1) {
                  req.body.taskId = null;
                }

                db.getTimesheetQuery(req, res, startDate, endDate, selectedUsers, req.body.jobId, req.body.taskId, req.body.weekId, function (err, rows) {

                  if (!err && rows.length > 0) {
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


  app.post('/searchTimesheetToCSV', mid.isAuth, function (req, res) {
    console.log("/searchTimesheetToCSV", req.body);

    if (req.isAuthenticated() && req.user && req.user.local) {

      if (req.user.local.user_type == 1) {


        var render = defaultRender(req);
        db.getJobs(req, res, function (err, jobs) {

          render.jobs = jobs;
          db.getTasks(req, res, function (err, tasks) {

            render.tasks = tasks;
            db.getUsers(function (err, rows) {
              render.users = rows;

              let selectedUsers = [];
              // parse the ints in req.body.userId
              if (req.body.userId) {

                // check if userId is an array
                if (!Array.isArray(req.body.userId)) {
                  req.body.userId = [req.body.userId];
                }
                
                for (var i = 0; i < req.body.userId.length; i++) {
                  selectedUsers.push(parseInt(req.body.userId[i]));

                }

                for (var i = 0; i < render.users.length; i++) {
                  if (selectedUsers.includes(render.users[i].id)) {
                    render.users[i].selected = true;
                  }
                }
              } 


              for (var i = 0; i < render.jobs.length; i++) {
                if (render.jobs[i].id == req.body.jobId) {

                  render.jobs[i].selected = true;
                }
              }
              for (var i = 0; i < render.tasks.length; i++) {
                if (render.tasks[i].id == req.body.taskId) {

                  render.tasks[i].selected = true;
                }
              }


              // parse dates from request into moment objects
              var startDate = moment(req.body.startDate);
              var endDate = moment(req.body.endDate);

              if (req.body.userId == -1) {
                req.body.userId = null;
              }

              if (req.body.jobId == -1) {
                req.body.jobId = null;
              }

              if (req.body.taskId == -1) {
                req.body.taskId = null;
              }


              if (req.body.weekId == -1) {
                req.body.weekId = null;
              }

              db.getTimesheetQuery(req, res, startDate, endDate, selectedUsers, req.body.jobId, req.body.taskId, req.body.weekId, function (err, timesheetData) {

                if (!err && timesheetData.length > 0) {
                  render.startDate = startDate;
                  render.endDate = endDate;
                  render.results = timesheetData;
                   convertArrayToXLSX(timesheetData, function(err){
                      if(!err){
                        res.download('timesheet.xlsx');
                      }
                   });
                   //res.download('timesheet.xlsx');
                } else {
                  res.err({
                    fr: "Unable to find hours for this user",
                    li: "/admin",
                    ti: "Maybe they have never clocked in"
                  });
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
  app.post('/updateInventoryItem', mid.isAuth, function (req, res) {
    if (req.user.local && req.user.local.user_type == 3) {
      //console.log(req.body.item)
      // must handle items like [ '3', '4' ] [ '1', '2' ] (quantity1, quatity2,) for (itemId1, itemId2)

      db.updateInventoryQuantity(req, res, function (err) {
        if (!err) {
          res.redirect('/#inventory')
        } else {
          res.send("An error has occured in /updateInventoryItem");
        }

      });
    } else {
      res.send("You are not a manger.")
    }
  });

  app.post('/addInventoryItem', mid.isAuth, function (req, res) {
    if (req.user.local && req.user.local.user_type == 1) {


      db.newInventoryItem(req.body.itemName, req.body.quantity, function (err) {
        res.redirect("/admin");
      });

    }
  });

  app.post('/updateUser/', mid.isAuth, function (req, res) {
    if (req.user.local && req.user.local.user_type == 1) {
      if (req.user.local.user_type == 1) {


        db.updateUser(req, res, function (err) {
          res.redirect("/admin");
        });

      }
    }
  });

  app.get('/modifyUser/:id', mid.isAuth, function (req, res) {
    if (req.user.local && req.user.local.user_type == 1) {

      if (req.user.local.user_type == 1) {
        var userId = req.params.id;
        var render = defaultAdminRender(req);
        db.getUser(userId, function (user) {
          render.user = user;
          //console.log( render.user);
          res.render('modifyUser.html', render);
        });
      }

    }
  });

  app.post('/updateInventory', mid.isAuth, function (req, res) {
    if (req.user.local && req.user.local.user_type == 1) {
      for (var i = 0; i < req.body.id.length; i++) {

        if (req.body.reorder && req.body.reorder[i]) {
          //console.log(req.body.reorder[i]);
        }
        //console.log(req.body.id[i]);
      }
      //console.log(req.body);


      db.updateInventory(req.body, function (err) {
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
      defaults: {
        sysName: sys.SYSTEM_NAME
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
      defaults: {
        sysName: sys.SYSTEM_NAME,
        domain: sys.DOMAIN,
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
