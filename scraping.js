const request = require('request');
const cheerio = require('cheerio');
const mysql = require('mysql');
const fs = require('fs');


const db_config = JSON.parse(fs.readFileSync('./secret/conf_db.json'));

var connection;

function handleDisconnect() {
  connection = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();



var page = 0, vals = [], part = 0;

getByPage(++page);


function getByPage(page) {
	request('https://doc.ua/doctors/kiev/all/page-'+page, function (error, response, html) {
		if (!error && response.statusCode == 200) {
		  var $ = cheerio.load(html);

		  var item = $('.item');
		  item.each(function(i,el){
		  	var fio = $(el).find('.h3 > a').attr('title');
		  	var img = 'https://doc.ua' + $(el).find('.card__image img').attr('src');

		  	console.log(fio);

		    vals.push('('+ connection.escape(fio) +','+ connection.escape(img) +')');
		  });



		  

		  if(page < 220) {
		  	getByPage(++page);

		  	if(part >= 3) {
		  		// connection.connect();
		  		part = 0;
		  		connection.query('INSERT INTO `dr` (`fio`,`img`) VALUES ' + vals.join(), function(err, rows, fields) {
  					if(err) throw err;
				});	
				// connection.end();

				vals = [];		
		  	} else {
		  		++part;
		  	}

		  } else {
		  	// connection.connect();
		  	connection.query('INSERT INTO `dr` (`fio`,`img`) VALUES ' + vals.join(), function(err, rows, fields) {
  				if(err) throw err;
			});	
		  	// connection.end();
		  	
		  }
		}
	});
}

