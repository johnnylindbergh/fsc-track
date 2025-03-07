// timesheetResolution.js

// Boilerplate code for a Node.js module

const db = require('./database.js');
const mid = require('./middleware.js');
const querystring = require('querystring');

const email  = require('./email.js');

const schedule = require('node-schedule');

// call a function that sends an email to all users with incomplete timesheets
schedule.scheduleJob('0 10 * * 2', function(){
    console.log('job triggered...');
    batchSendTimesheetNotificationEmails(function (){
        console.log('emails sent');
    });
});




const query = 'SELECT timesheet.*, jobs.name as job_name, tasks.name as task_name FROM timesheet JOIN jobs ON timesheet.job = jobs.id JOIN tasks ON timesheet.task = tasks.id WHERE userid = ? AND clock_in > DATE_SUB(NOW(), INTERVAL 30 DAY) AND marked_as_incomplete = 1';

// Function to be exported
function getIncompleteTimesheetEntriesByUserId(user_id, cb) {
    // query the database for the timesheet with user id, in the last 30 days, and marked_as_incomplete = 1; 
    // return the timesheet

    db.connection.query(query, [user_id], (err, rows) => {
        if (err) {
            console.log(err);
            cb(err);
          }
        console.log(rows);
        cb(rows);
    }
    );

    return null;
}

function getAllIncompleteTimesheetEntries(cb) {
    // query the database for the timesheet entries with clock_in made in the last 30 days, and marked_as_incomplete = 1; 
    


    

    db.connection.query('SELECT *, jobs.name as job_name, tasks.name as task_name, users.name as user_name FROM timesheet JOIN users ON timesheet.userid = users.id JOIN jobs on timesheet.job = jobs.id join tasks on timesheet.task = tasks.id WHERE clock_in > DATE_SUB(NOW(), INTERVAL 30 DAY) AND marked_as_incomplete = 1', (err, rows) => {
        if (err) {
            console.log(err);
            cb(err);
          }
        console.log(rows);
        cb(rows);
    }
    );

    return null;
}

function batchSendTimesheetNotificationEmails(cb) {
    // get a list of users that have incomplete timesheets
    // for each user, send an email with a link to resolveUser

    console.log("Attempting to send batch emails...");

    db.connection.query('SELECT DISTINCT userid FROM timesheet WHERE clock_in > DATE_SUB(NOW(), INTERVAL 30 DAY) AND marked_as_incomplete = 1', (err, rows) => {
        if (err) {
            console.log(err);
            cb(err);
          }
        console.log(rows);
        rows.forEach(row => {
            email.sendResolveEmail(row.userid);
        });
        cb(rows);
    }
    );
}

// get all sus timesheet entries from the last 15 days
// a timesheet entry is sus if the notes column is empty or whitespace
// a timesheet entry is sus if the notes = '-- auto clock out --'
function getSusTimesheetEntries(cb) {
    db.connection.query('SELECT timesheet.*, users.name as user_name, jobs.name as job_name, tasks.name as task_name FROM timesheet JOIN users ON timesheet.userid = users.id JOIN jobs ON timesheet.job = jobs.id JOIN tasks ON timesheet.task = tasks.id WHERE clock_in > DATE_SUB(NOW(), INTERVAL 15 DAY) AND (notes IS NULL OR notes = "" OR notes = "-- auto clock out --")', (err, rows) => {
        if (err) {
            console.log(err);
            cb(err);
          }
        console.log(rows);
        cb(rows);
    }
    );
}




// Export the function
module.exports = function(app)  {

    app.get('/resolveUser', mid.isAuth, (req, res) => {
        // if user is authenticated and has a local account
        if (req.user && req.user.local && req.user.local.user_type === 2 || req.user.local.user_type === 1) {
            // render the timesheetResolution page

            getIncompleteTimesheetEntriesByUserId(req.user.local.id, function(rows){
                res.rend('timesheetResolution.html', { 
                    incompleteEntries: rows,
                    isSingleEntry: rows.length == 1
                });
            })
           
        } else {
            // if user is not authenticated, redirect to login page
            res.err({
                r: new Error('Unauthorized access'),
                fr: 'You are not authorized to access this resource.',
                li: '/auth/google?returnTo=' + querystring.escape(req.url),
                ti: 'Authenticate as a different user'
            });
        
        }
    });

    app.get("/resolveAdmin", mid.isAuth, (req, res) => {
        // if user is authenticated and has a local account
        if (req.user && req.user.local && req.user.local.user_type === 1) {
            // render the timesheetResolution page
            getSusTimesheetEntries(function(rows){

                console.log(rows);

                // for each row, check if the notes column is empty or whitespace
                // if it is, set the notes column to warning emoji

                rows.forEach(row => {
                    if (row.notes === null || row.notes.trim() === "") {
                        row.notes = "⚠️";
                    }
                });
                
                res.rend('timesheetResolutionAdmin.html', { 
                    incompleteEntries: rows,
                    isSingleEntry: rows.length == 1
                });
            }
            );
            
        } else {
            // if user is not authenticated, redirect to login page
            res.err({
                r: new Error('Unauthorized access'),
                fr: 'You are not authorized to access this resource.',
                li: '/auth/google?returnTo=' + querystring.escape(req.url),
                ti: 'Authenticate as a different user'
            });
        }
    });

    app.post("/markTimesheetEntryAsIncomplete", mid.isAuth, (req, res) => {
        // if user is authenticated and has a local account
        if (req.user && req.user.local && req.user.local.user_type === 1) {
            // render the timesheetResolution page
            const {timesheet_id} = req.body;
            db.connection.query('UPDATE timesheet SET marked_as_incomplete = 1 WHERE id = ?', [timesheet_id], (err, rows) => {
                if (err) {
                    console.log(err);
                    res.send('error');
                }
                res.redirect('/resolveAdmin');  
            }
            );
        } else {
            // if user is not authenticated, redirect to login page
            res.err({
                r: new Error('Unauthorized access'),
                fr: 'You are not authorized to access this resource.',
                li: '/auth/google?returnTo=' + querystring.escape(req.url),
                ti: 'Authenticate as a different user'
            });
        }
    }
    );

    app.post("/markTimesheetEntryAsComplete", mid.isAuth, (req, res) => {
        // if user is authenticated and has a local account
        if (req.user && req.user.local && req.user.local.user_type === 1) {
            // render the timesheetResolution page
            const {timesheet_id} = req.body;
            db.connection.query('UPDATE timesheet SET marked_as_incomplete = 0 WHERE id = ?', [timesheet_id], (err, rows) => {
                if (err) {
                    console.log(err);
                    res.send('error');
                }
                res.send('success');
            }
            );
        } else {
            // if user is not authenticated, redirect to login page
            res.err({
                r: new Error('Unauthorized access'),
                fr: 'You are not authorized to access this resource.',
                li: '/auth/google?returnTo=' + querystring.escape(req.url),
                ti: 'Authenticate as a different user'
            });
        }
    }
    );



    // recieves a timesheet.id and a note from the user that is appended to the notes column of the timesheet entry. 
    // finally, the marked_as_incomplete column is changed to 0

    app.post("/resolveTimesheet", mid.isAuth, (req, res) => {

        if (req.user && req.user.local && req.user.local.user_type === 2 || req.user.local.user_type === 1) {
            // render the timesheetResolution page
            const {timesheet_id, note} = req.body;
            db.connection.query('UPDATE timesheet SET notes = CONCAT(notes, ?), marked_as_incomplete = 0 WHERE id = ?', [note, timesheet_id], (err, rows) => {
                if (err) {
                    console.log(err);
                    res.send('error');
                }
                res.send('success');
            }
            );
        } else {
            // if user is not authenticated, redirect to login page
            res.err({
                r: new Error('Unauthorized access'),
                fr: 'You are not authorized to access this resource.',
                li: '/auth/google?returnTo=' + querystring.escape(req.url),
                ti: 'Authenticate as a different user'
            });
        }
    }
    );

  

};