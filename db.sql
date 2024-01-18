
DROP DATABASE IF EXISTS fscTrack;
CREATE DATABASE fscTrack;

USE fscTrack;

-- user roles
CREATE TABLE user_types (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(64),
  PRIMARY KEY (id)
);

-- role #2 is assumed default
INSERT INTO user_types (title) VALUES ("Admin"), ("Worker"), ("Manager");


-- user information
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  user_type INT DEFAULT 2,
  name VARCHAR(64),
  email VARCHAR(64) NOT NULL UNIQUE,
  phone_number VARCHAR(64) NULL UNIQUE,
  clockedIn TINYINT(1) DEFAULT 0,
  public_key VARCHAR(64),
  authentication_token VARCHAR(64),
  isArchived TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_type) REFERENCES user_types(id),
  PRIMARY KEY (id)

);

INSERT INTO users (user_type, name, email) VALUES (1, "Johnny","lindberghjohnny@gmail.com");

CREATE TABLE jobs (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(64),
  isArchived TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id)
);




CREATE TABLE tasks (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(64),
  isArchived TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id)
);


CREATE TABLE timesheet (
  id INT NOT NULL AUTO_INCREMENT,
  userid INT,
  job INT,
  task INT,
  clock_in DATETIME,
  clock_out DATETIME,
  duration FLOAT(8, 3),
  notes VARCHAR(64),
  FOREIGN KEY (job) REFERENCES jobs(id),
  FOREIGN KEY (task) REFERENCES tasks(id),
  FOREIGN KEY (userid) REFERENCES users(id),
  PRIMARY KEY (id)

);

CREATE TABLE inventory (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(64),
  description VARCHAR(64),
  quantity DECIMAL(10, 2),
  threshold DECIMAL(10, 2),
  reorder TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE inventory_job (
  id INT NOT NULL AUTO_INCREMENT,
  timeRecorded DATETIME DEFAULT CURRENT_TIMESTAMP,
  userid INT,
  jobid INT,
  taskid INT,
  inventoryid INT,
  quantity_used DECIMAL(10, 2),
  FOREIGN KEY (inventoryid) REFERENCES inventory(id),
  FOREIGN KEY (userid) REFERENCES users(id),
  FOREIGN KEY (jobid) REFERENCES jobs(id),
  FOREIGN KEY (taskid) REFERENCES tasks(id),
  PRIMARY KEY (id)

);


