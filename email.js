var nodemailer = require('nodemailer');
const creds = require('./credentials.js');
const db = require('./database.js');
const moment = require('moment');

// setup email here
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: creds.serverEmail,
        pass: creds.emailPassword
    }
});
module.exports = {
    sendResolveEmail(userid) {

        // get the user's email
        // get the timesheet entries marked as incomplete, in the last 30 days for the user ie call the function getIncompleteTimesheetEntriesByUserId
        // send an email to the user with the timesheet entries and a link to domain/resolveUser

        db.connection.query('SELECT email FROM users WHERE id = ?', [userid], (err, user) => {

            if (err) {
                console.log(err);
            }

            db.connection.query(`
                SELECT timesheet.*, users.email, jobs.name as job, tasks.name as task 
                FROM timesheet 
                JOIN users ON timesheet.userid = users.id 
                JOIN jobs ON timesheet.job = jobs.id 
                JOIN tasks ON timesheet.task = tasks.id 
                WHERE timesheet.clock_in > DATE_SUB(NOW(), INTERVAL 30 DAY) 
                AND timesheet.marked_as_incomplete = 1 
                AND timesheet.userid = ?
            `, [userid], (err, rows) => {
                if (err) {
                    console.log(err);
                }
                console.log(rows);

                // format the rows to look nice in the email

                let emailBody = "";

                rows.forEach(row => {
                    emailBody += "\n"+ "Job: " + row.job_name + " Task: " + row.task_name + " Clock in: " + moment(row.clock_in).format('MMMM Do YYYY, h:mm:ss a') + "\n";
                }
                );

                var mailOptions = {
                    from: creds.serverEmail,
                    to: user[0].email,
                    subject: 'Please review your timesheet entries',
                    text: 'You have incomplete timesheet entries. Please resolve them at ' + creds.domain + '/resolveUser' + '\n' + emailBody
                };

                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });

            }
            );
        }
        );
    }
}

