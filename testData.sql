use fscTrack;
INSERT INTO users (user_type, name, email, phone_number) VALUES (1, "Johnny","lindberghjohnny@gmail.com", "+14342491362");
INSERT INTO users (user_type, name, email, phone_number) VALUES (1, "Gerry Frank","gfrank@franksaulconstruction.com", "+14342842815");
INSERT INTO users (user_type, name, email) VALUES (1, "Jonathan Mayo","jmayo@franksaulconstruction.com");
INSERT INTO users (user_type, name, email) VALUES (2, "Hector","hr70669@gmail.com");
INSERT INTO users (user_type, name, email) VALUES (2, "Sarah","smcgovern@gmail.com");
INSERT INTO users (user_type, name, email) VALUES (1, "Brenden","bsaul@franksaulconstruction");


insert into jobs (name) values ("Arc of The Piedmont");
insert into jobs (name) values ("BMC");
insert into jobs (name) values ("Jefferson Quarry");
insert into jobs (name) values ("Stone Fox");
insert into jobs (name) values ("Shop");




insert into tasks (name) values ("Cabinets");
insert into tasks (name) values ("Doors");
insert into tasks (name) values ("Trim");
insert into tasks (name) values ("Countertops");
insert into tasks (name) values ("Flooring");
insert into tasks (name) values ("Job Site Installation.");

INSERT INTO timesheet (userid, job, task, clock_in, clock_out) VALUES (1, 1, 1, "2024-03-24 02:00:00.000", "2024-03-24 04:02:00.000");