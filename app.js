import express from 'express';
import bodyParser from 'body-parser';

import db from './db/db';// Set up the express app
const app = express();// get all todos

var fs = require('fs');
var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');

const classifier_ids = ["DefaultCustomModel_1909949655"];
const threshold = 0.2;

var visualRecognition = new VisualRecognitionV3({
	version: '2018-03-19',
	iam_apikey: 'NdKpl8oYJlgsk5Jw1PedLgBZb37_oZsNIQlK0UgV2F9z'
});

// Parse incoming requests data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/api/v1/trash', (req, res) => {
  res.status(200).send({
    success: 'true',
    message: 'trashes retrieved successfully',
    todos: db
  })
}); const PORT = 5000;

app.get('/api/v1/trash/:point', (req, res) => { 
  const id = parseInt(req.params.point, 10); 
    db.map((trash) => {    
      console.log(req.query.date + " " + trash.date)
      if (trash.point == id && trash.date == req.query.date) {  
        return res.status(200).send({     
          success: 'true', 
          message: 'trash retrieved successfully',   
          trash,      
        });    
      } 
    });
  return res.status(404).send({   
    success: 'false',   
    message: 'todo does not exist',  
  });
});

app.post('/api/v1/trash', (req, res) => {

  //check fields
  if (!req.body.point) {
    return res.status(400).send({
      success: 'false',
      message: 'point id is required'
    });
  } else if (!req.body.base64) {
    return res.status(400).send({
      success: 'false',
      message: 'image base 64 is required'
    });
  }

  const id = parseInt(req.body.point, 10);
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

  let filename = makeid(6);

  //Check if exists
  let trashFound;
  let itemIndex;
  db.map((trash, index) => {
    if (trash.point == id && trash.date == date) {
      trashFound = trash;
      itemIndex = index;
    }
  });

  fs.writeFileSync(filename+".jpg", req.body.base64, 'base64', function(err) {
    console.log(err);
  });

  var images_file = fs.createReadStream(filename+'.jpg');
  
  var params = {
    images_file: images_file,
    classifier_ids: classifier_ids,
    threshold: threshold
  };
  
  let type;
  visualRecognition.classify(params, function(err, response) {
    if (err) { 
      console.log(images_file);
      console.log(err);
      return res.status(500).send(err);
    } else {
      console.log(JSON.stringify(response.images[0].classifiers[0].classes[0].class, null, 2))
      type = response.images[0].classifiers[0].classes[0].class;  
      
      fs.unlink(filename+".jpg", (err) => {
        if (err) {
          console.error(err)
          return
        }
      });
  
      var tipo = ""

      switch (type) {
        case "cardboard":
          tipo = "cartón - gris"
          break;
        case "glass":
          tipo = "vidrio - azul"
          break;
        case "metal":
          tipo = "metal - amarillo"
          break;
        case "paper":
          tipo = "papel - gris"
          break;
        case "plastic":
          tipo = "plástico - azul"
          break;
        case "trash":
          tipo = "ordinario - verde"
          break;
      }

      //If not exists, creates the entry
      if(!trashFound){
        console.log(images_file);
        const trash = {
          id: db.length + 1,
          point: req.body.point,
          date: date,
          cardboard: type ==  "cardboard" ? 1 : 0,
          glass: type ==  "glass" ? 1 : 0,
          metal: type ==  "metal" ? 1 : 0,
          paper: type ==  "paper" ? 1 : 0,
          plastic: type ==  "plastic" ? 1 : 0,
          trash: type ==  "trash" ? 1 : 0
        }
        db.push(trash);
        return res.status(201).send({
          success: 'true',
          message: 'trash added successfully',
          type: tipo,
          score: response.images[0].classifiers[0].classes[0].score
        })
      }
      //if already exists, updates the entry
      else{
        console.log(images_file);
        const updatedTrash = {
          id: trashFound.id,
          point: req.body.point,
          date: date,
          cardboard: type ==  "cardboard" ? trashFound.cardboard + 1 : trashFound.cardboard,
          glass: type ==  "glass" ? trashFound.glass + 1 : trashFound.glass,
          metal: type ==  "metal" ? trashFound.metal + 1 : trashFound.metal,
          paper: type ==  "paper" ? trashFound.paper + 1 : trashFound.paper,
          plastic: type ==  "plastic" ? trashFound.plastic + 1 : trashFound.plastic,
          trash: type ==  "trash" ? trashFound.trash + 1 : trashFound.trash
        };

        db.splice(itemIndex, 1, updatedTrash);

        return res.status(200).send({
          success: 'trued',
          message: 'trash added successfully',
          type: tipo,
          score: response.images[0].classifiers[0].classes[0].score
        });
      }
    }
  });

});

app.listen(process.env.PORT || 5000)

function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  console.log(result);
  return result;
}