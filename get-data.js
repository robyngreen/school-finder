Object.keys(states).forEach(function(element, key, _array) {
      var item = states[key];
      //insertPromises.push(new Promise((resolve,rej)=>connection.query('INSERT IGNORE INTO state (name, abbr) VALUES (?, ?)', [item.name, item.abbr], function (error, results, fields) { }));
      //insertPromises.push(new Promise((resolve,rej)=>connection.query('INSERT IGNORE INTO state (name, abbr) VALUES (?, ?)', [item.name, item.abbr])));
      //insertPromises.push(dbQuery('INSERT IGNORE INTO state (name, abbr) VALUES (?, ?)', [item.name, item.abbr]));
      //
      await dbQuery('INSERT IGNORE INTO state (name, abbr) VALUES (?, ?)', [item.name, item.abbr]);

      // Loop through state scraping.
      var body = await new Promise(function(resolve, reject) {
        request(baseURL + item.abbr, function (err, body) {
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
        // 125 students 5 - 12 years old.
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
    });
