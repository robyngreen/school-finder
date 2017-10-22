'use strict';

const request = require('tinyreq');
const cheerio = require('cheerio');
const mysql = require('mysql');
const madison = require('madison');
const geo = require('node-geocoder');
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
    var insertPromises = [];
    Object.keys(states).forEach(function(element, key, _array) {
      var item = states[key];
      //insertPromises.push(new Promise((resolve,rej)=>connection.query('INSERT IGNORE INTO state (name, abbr) VALUES (?, ?)', [item.name, item.abbr], function (error, results, fields) { }));
      //insertPromises.push(new Promise((resolve,rej)=>connection.query('INSERT IGNORE INTO state (name, abbr) VALUES (?, ?)', [item.name, item.abbr])));
      insertPromises.push(dbQuery('INSERT IGNORE INTO state (name, abbr) VALUES (?, ?)', [item.name, item.abbr]));
    });
    await Promise.all(insertPromises);

    // Loop through state scraping.
    var body = await new Promise(function(resolve, reject) {
      request(baseURL + 'AK', function (err, body) {
        resolve(body);
      })
    });

    let schoolOperations = [];
    let $ = cheerio.load(body);
    $('.list').each(function(index, element) {
      let schoolName = $('h2', element).text();
      let schoolInfo = $('p', element).html().split('<br>');
      let schoolAddress = schoolInfo[0] + ' ' + schoolInfo[1];
      let schoolAge = schoolInfo[2];

      // Begin parsing some regex.
      // 420 students 5 - 12 years old
      let regex = /([0-9]+) students ([0-9\.]+)( weeks|) - ([0-9]+) years old/;
      let schoolResults = schoolAge.match(regex);

      // Store the first number in weeks for consistency. The FE will have the
      // responsibilty of converting these to years for better readability.
      if (schoolResults[3] === '') {
        schoolResults[2]  = schoolResults[2] * 52;
      }

      let operation = new Promise(function(resolve, reject) {
        geocoder.geocode(schoolAddress)
          .then(function(res) {
            let results = res[0];
            let lat = results.latitude;
            let lon = results.longitude;
            let city = results.city;
            let state = results.administrativeLevels.level1short;

            connection.query('SELECT id FROM state WHERE abbr = ?', [state], function (stateError, stateID) {
              let sid = stateID[0].id;
              connection.query('INSERT INTO city (name, state) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)', [city, sid, city], function (cityError, cityResults) {
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
                }
                console.log(school);
                connection.query('INSERT INTO school SET ? ON DUPLICATE KEY UPDATE startage = ?, endage = ?, num_students = ?', [school, schoolResults[2], schoolResults[4], schoolResults[1]], function (schoolError, schoolResults) {
                  if (schoolError) {
                    console.log(schoolError);
                  }
                  resolve();
                });
              });
            });
          });
        });
      schoolOperations.push(operation);
    });
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

    /*await new Promise(function(resolve, reject) {
      request(baseURL + 'AK', function (err, body) {
        let $ = cheerio.load(body);
        $('.list').each(function(index, element) {
          var schoolName = $('h2', element).text();
          var schoolInfo = $('p', element).html().split('<br>');
          var schoolAddress = schoolInfo[0] + ' ' + schoolInfo[1];
          var schoolAge = schoolInfo[2];

          // Begin parsing some regex.
          // 420 students 5 - 12 years old
          var regex = /([0-9]+) students ([0-9\.]+)( weeks|) - ([0-9]+) years old/;
          var results = schoolAge.match(regex);

          // Store the first number in weeks for consistency. The FE will have the
          // responsibilty of converting these to years for better readability.
          if (results[3] === '') {
            results[2]  = results[2] * 52;
          }

          // Get a geocoded info based on address.
          geocoder.geocode(schoolAddress, function(err, res) {
            var results = res[0];
            var lat = results.latitude;
            var lon = results.longitude;
            var city = results.city;
            var state = results.administrativeLevels.level1short;
            // Get the state ID.
            connection.query('SELECT id FROM state WHERE abbr = ?', state, function (stateError, stateID) {
              if (stateError) {
                console.log('error');
                console.log(stateError);
              }
              console.log('results: ');
              console.log(stateID);
            });
            /*var stateSQL = 'INSERT IGNORE INTO state (name) VALUES (' + state + ')';
            connection.query('INSERT IGNORE INTO state (name) VALUES (?)', [state], function (error, results, fields) {
              console.log('results: ');
              console.log(results);
            });*/
            //var sql = 'INSERT INTO schools (name, address, city, latitude, longitude, startage, endage) VALUES (' + schoolName + ', ' + schoolAddress + ', ' + city + ', ' + lat + ', ' + lon + ', ' + results[2] + ', ' + results[4] + ', ' + results[1] + ')';
/*
          });
        });
      });
    });
*/



  /*
  request(baseURL + 'AK', function (err, body) {
    let $ = cheerio.load(body);
    $('.list').each(function(index, element) {
      var schoolName = $('h2', element).text();
      var schoolInfo = $('p', element).html().split('<br>');
      var schoolAddress = schoolInfo[0] + ' ' + schoolInfo[1];
      var schoolAge = schoolInfo[2];

      // Begin parsing some regex.
      // 420 students 5 - 12 years old
      var regex = /([0-9]+) students ([0-9\.]+)( weeks|) - ([0-9]+) years old/;
      var results = schoolAge.match(regex);

      // Store the first number in weeks for consistency. The FE will have the
      // responsibilty of converting these to years for better readability.
      if (results[3] === '') {
        results[2]  = results[2] * 52;
      }


      console.log(schoolName);
      console.log(schoolAge);
      console.log('Num students: ' + results[1]);
      console.log('Start Age: ' + results[2]);
      console.log('End Age: ' + results[4]);
    });
  });

  */

  /*

  //https://amshq.org/School-Resources/Find-a-School?m=US_STATE&s=AK

  request("http://ionicabizau.net/", function (err, body) {
      console.log(err || body); // Print out the HTML
  });


  */

  /*
  madison.getStateAbbrev('new hampshire', function (abbrev) {
    console.log(abbrev); //'VA'
  });
  */

  /*
  console.log(states.length);

  Object.keys(states).forEach(function(element, key, _array) {
    var item = states[key];
    console.log(item.name);
    console.log(item.abbr);
    console.log(' ');
  });
  */
  } catch (e) {
    console.log(e);
  }
})();
