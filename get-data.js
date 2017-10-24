'use strict';

const request = require('tinyreq');
const cheerio = require('cheerio');
const mysql = require('mysql');
const madison = require('madison');
const geo = require('node-geocoder');
var RateLimiter = require('limiter').RateLimiter;
const states = madison.states;
const baseURL = 'https://amshq.org/School-Resources/Find-a-School?m=US_STATE&s=';

// Setup geocoding options.
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: 'AIzaSyBRkuCulzUl4pK6YvNR_xvOi55SliwwCsI'
};
var geocoder = geo(options);

// Mysql connection info. DO NOT SUBMIT TO git.
let connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'school_finder',
  'supportBigNumbers': true
});

/**
 *
 */
function dbQuery(query, vars) {
  return new Promise(function(resolve, reject) {
    connection.query(query, vars, function (err, rows, fields) {
        if (err) {
          return reject(err);
        }
        resolve(rows);
    });
  });
}

/**
 *
 */
function getStateData(item) {
  return new Promise(function(resolve, reject) {
    connection.query('INSERT IGNORE INTO state (name, abbr) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)', [item.name, item.abbr], function (stateError, stateResults) {
      let sid = stateResults.insertId;
      connection.query('SELECT raw_html FROM state_data WHERE state = ?', [sid], function (rawError, rawResults) {
        // If no results, scrape the data. Else, use the results.
        let returnData = {
          'source': baseURL + item.abbr,
          'sid': sid,
          'markup': '',
        }
        if (rawResults.length === 0) {
          console.log('making url request for data ' + item.name);
          request(baseURL + item.abbr, function(error, results) {
            returnData.markup = results;
            resolve(returnData);
          });
        }
        else {
          console.log('data in database, getting there ' + item.name);
          returnData.markup = rawResults[0].raw_html;
          resolve(returnData);
        }
      });
    });
  });
}

// Main app.
(async ()=>{
  try {
    // Establish a DB connection.
    await new Promise(function(resolve, reject) {
      connection.connect(function(err) {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });

    // Create the base table if it doesn't exists.
    // Could use multiple here, but disable for security reasons.
    let createStates = `create table if not exists state(
      id int primary key auto_increment,
      name varchar(255) not null unique,
      abbr varchar(255) not null unique
    )`;
    await dbQuery(createStates);

    let createCities = `create table if not exists city(
      id int primary key auto_increment,
      name varchar(255) not null,
      state int,
      foreign key (state) references state(id)
    )`;
    let cityResults = await dbQuery(createCities);
    // If there was a warning, the table already existed. Do not
    // create a new index (it will fail and hang the sql connection.)
    if (!cityResults.warningCount) {
      let createCityIndex = `CREATE UNIQUE INDEX location ON city (name, state)`;
      await dbQuery(createCityIndex);
    }

    // Store the blob of data so repeated updates don't ping URLs.
    // @todo: if 'update' param is used, ignore this.
    let createStateData = `create table if not exists state_data(
      id int primary key auto_increment,
      raw_html mediumtext not null,
      state int,
      source varchar(255) not null unique,
      foreign key (state) references state(id)
    )`;
    await dbQuery(createStateData);

    let createSchools = `create table if not exists school(
      id int primary key auto_increment,
      name varchar(255) not null,
      address varchar(255) not null,
      address2 varchar(255),
      city int,
      latitude decimal(8,6),
      longitude decimal(9,6),
      startage decimal(5,2) unsigned,
      endage tinyint unsigned,
      num_students int unsigned,
      type varchar(255),
      foreign key (city) references city(id)
    )`;
    let schoolResults = await dbQuery(createSchools);
    // If there was a warning, the table already existed. Do not
    // create a new index (it will fail and hang the sql connection.)
    if (!schoolResults.warningCount) {
      let createSchoolIndex = `CREATE UNIQUE INDEX school ON school (name, city)`;
      await dbQuery(createSchoolIndex);
    }

    // Go ahead and setup the states in the DB.
    //let insertPromises = [];
    let schoolOperations = [];
    let rawData = [];
    let substates = states.slice(0, 10);
    console.log(substates);

    await Promise.all(substates.map(function(item) {
      return getStateData(item);
    })).then(function(results) {
      rawData = results;
    });

    await Promise.all(rawData.map(function(item) {
      // Store the data in a DB. Update flag should ignore this.
      connection.query('INSERT INTO state_data (raw_html, state, source) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)', [item.markup, item.sid, item.source], function (e, r) {
      });
      let $ = cheerio.load(item.markup);
      console.log('================================================');
      console.log('looking at state ' + item.sid);
      $('.list').each(function(index, element) {
        let schoolName = $('h2', element).text();
        let schoolInfo = $('p', element).html().split('<br>');
        let schoolAddress = schoolInfo[0] + ' ' + schoolInfo[2];
        let schoolAge = schoolInfo[3];

        console.log('================================================');
        // As the brs are not formatted, attempt to match second line
        // addresses.
        let stateRegex = /^.*?, [a-zA-Z]{2} \d/;
        let stateResults = schoolInfo[1].match(stateRegex);
        console.log('looking at ' + schoolInfo[1]);
        if (stateResults !== null) {
          console.log('valid state');
          schoolAddress = schoolInfo[0] + ' ' + schoolInfo[1];
          schoolAge = schoolInfo[2];
        }

        // Begin parsing some regex.
        // 420 students 5 - 12 years old
        let regex = /([0-9]+) students ([0-9\.]+)( weeks|) - ([0-9]+) years old/;
        let schoolResults = schoolAge.match(regex);

        if (schoolResults !== null) {
          // Store the first number in weeks for consistency. The FE will have the
          // responsibilty of converting these to years for better readability.
          if (schoolResults[3] === '') {
            schoolResults[2] = schoolResults[2] * 52;
          }
        }
        else {
          schoolResults = ['', 0, 0, '', 0];
        }

        // Skip testing data on live site.
        if (schoolName === 'Test 2 Matthew School') {
          return true;
        }

        //console.log('schoolName: ' + schoolName);
        //console.log('schoolAddress: ' + schoolAddress);
        //console.log('schoolAge: ' + schoolAge);
        //console.log('schoolResults: ' + schoolResults);

        let operation = new Promise(function(resolve, reject) {
          //console.log('=====================[ GEO ]=====================');
          //console.log(schoolAddress);substates
          //
          // Do not geocode if state is already there.
          // @todo: if update param is used, ignore this.
          connection.query('SELECT id FROM school WHERE name = ? AND address = ?', [schoolName, schoolAddress], function (existsError, existsID) {
            if (existsID.length === 0) {
              geocoder.geocode(schoolAddress).then(function(res) {
                let results = res[0];
                //console.log(results);
                let lat = results.latitude;
                let lon = results.longitude;
                let city = results.city;
                let state = results.administrativeLevels.level1short;

                var limiter = new RateLimiter(45, 'second');

                limiter.removeTokens(1, function(err, remainingRequests) {
                });

                connection.query('INSERT INTO city (name, state) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)', [city, item.sid], function (cityError, cityResults) {
                  if (cityError) {
                    console.log(cityError);
                  }
                  let cid = cityResults.insertId;
                  let school = {
                    'name': schoolName,
                    'address': schoolAddress,
                    'city': cid,
                    'latitude': lat,
                    'longitude': lon,
                    'startage': schoolResults[2],
                    'endage': schoolResults[4],
                    'num_students': schoolResults[1],
                    'type': 'montessori'
                  }
                  connection.query('INSERT INTO school SET ? ON DUPLICATE KEY UPDATE startage = ?, endage = ?, num_students = ?', [school, schoolResults[2], schoolResults[4], schoolResults[1]], function (schoolError, schoolResults) {
                    resolve();
                  });
                });
              });
            }
            else {
              resolve();
            }
          });
        });
        schoolOperations.push(operation);
      });
    }));

    await Promise.all(schoolOperations);

    // Now that the above are async wait, close the DB connection.
    await new Promise(function(resolve, reject) {
      connection.end(function(err) {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  } catch (e) {
    console.log(e);
  }
})();
