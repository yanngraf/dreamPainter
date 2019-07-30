// A RunWay model (SPADE-Coco / SPADE-LANDSCAPE) must be running 
// Please check the readme file


// ADD Photosketch
// ADD credits for matteo / Muda workshop
// 
// Copyright (c) 2018 ml5
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT


// Settings
let runwayModelName = "SPADE-LANDSCAPE";  // SPADE-COCO or SPADE-LANDSCAPE
var socket = io.connect('http://127.0.0.1:3000/');

let waitingTimeDuration = 200;

// Initilizing the variables
let poses = [];
let history = [];

let img;
let raw = new Image();
let video;
let poseNet;
let v;

// Body part vart initialisation
let nose_y;
let leftWrist_x;
let leftWrist_y;

let rightWrist_x;
let rightWrist_y;

let distance_x_wrist;
let distance_y_wrist;

// Painter variable initialisation
let paintStatus = false;
let paintBrush = 0;
let paintBrushSet = [];
let paintColor = 0;

let paintBrushProximityCounter = 0;
let brushName = "";

let waitingSince;
let color_background = 50;
let color_background_set = 0;


// For testing
let waitingModeStatus = "on" // on or off (if "off" the background never changes) 



// Wait until the page is loaded
document.addEventListener("DOMContentLoaded", function(event) {
  // Get the DOM elements
  var status = document.getElementById('status');
  var startBtn = document.getElementById('start');
  var stopBtn = document.getElementById('stop');
  var video2 = document.querySelector('video');
  var canvas = document.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var localMediaStream = null;
  var shouldLoop = false;

  // Get the user's camera
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        video2.srcObject = stream;
        video2.play();
      });
  }

  // When a connection is established
  socket.on('connect', function() {
    status.innerHTML = 'Connected';
  });

  // When there is new data coming in, update the log element
  socket.on('data', function(data) {
    if (shouldLoop) {
      sendImage();
    }
  });

  // Get the current frame and send it to Runway using the Canvas API
  function sendImage() {
    ctx.drawImage(video2, 0, 0, 300, 280);
    // Send to Runway the current element in the canvas
    socket.emit('query', {
        semantic_map: document.getElementById("defaultCanvas0").toDataURL('image/jpeg'),        
    });
  }

  // Start the loop: send an image, wait for response, send another one...
  function start() {
    shouldLoop = true;
    sendImage()
  }
  // Stop the loop
  function stop() {
    shouldLoop = false;
  }

  // Listen to start and stop event
  startBtn.addEventListener('click', start, false);
  stopBtn.addEventListener('click', stop, false);

  // Get the DOM log element
  var status = document.getElementById('status');
  var log = document.getElementById('log');
  
  // When a connection is established
  socket.on('connect', function() {
    status.innerHTML = 'Connected';
  });
  // When there is a data event, update the log element
  socket.on('data', newDrawing);
});



function setup() {

  selectColorSet(runwayModelName);
  
  cnv = createCanvas(640, 480);
  cnv.parent('p5canvas');
  cnv.style('z-index', '-1');

  video = createCapture(VIDEO);
  video.size(width, height);

  // PoseNet Setup
  var posenetoptions = { 
    flipHorizontal: true,
  };

  // Create a new poseNet method with a single detection
  poseNet = ml5.poseNet(video, posenetoptions, modelReady);
  // This sets up an event that fills the global variable "poses"
  // with an array every time new poses are detected
  poseNet.on('pose', function(results) {
    poses = results;
  });


  noStroke();
  textSize(20);

  // Hide the video element, and just show the canvas
  video.hide();
  paintColor = color(1, 0, 0)

}




function draw() {

  background(color_background)
  drawHistory();
  drawHand();

  //drawSkeleton();

  waitingMode(waitingSince);
  
  waitingSince++;
}






// Draw the controls
function drawHand() {

  // if poses are available, draw tools
  if(poses.length > 0) {
  
    nose_y = poses[0].pose.nose.y;
    leftWrist_x = poses[0].pose.leftWrist.x;
    leftWrist_y = poses[0].pose.leftWrist.y;
    rightWrist_x = poses[0].pose.rightWrist.x;
    rightWrist_y = poses[0].pose.rightWrist.y;

    // if poses are detect, reset the counter.
    waitingSince = 0;

    // Check if hand is above nose && start painting
    if (leftWrist_y < nose_y || rightWrist_y < nose_y ) {
      paintStatus = true;
    } else {
      paintStatus = false;
    }
  
    /////// Testing - Draw the nose
    stroke(255);
    strokeWeight(1);
    line(0, nose_y, 2000, nose_y);
    noStroke();
    ///////

    // Start Painter
    if (paintStatus == true) {
      //ellipse(rightWrist_x, rightWrist_y, 40);

      // Adding a data point (vector) to the history
      v = createVector(rightWrist_x,rightWrist_y,paintColor);
      history.push(v);

      // if the vector history is too long, start removing from the end
      if (history.length > 2000) {
        history.shift(v);
      }
    }


    distance_x_wrist = leftWrist_x - rightWrist_x;
    distance_y_wrist = leftWrist_y - rightWrist_y;
    
    switchControls ();
    drawControls();
  }
}




// Changes the brush
function switchControls () {

  if (distance_x_wrist < 100 && distance_y_wrist <100) {

    paintBrushProximityCounter++;

    // Place a delay between switching brushes
    if (paintBrushProximityCounter > 60) {

      stroke(0);
      strokeWeight(4);
      line(leftWrist_x, leftWrist_y, rightWrist_x, rightWrist_y);
      noStroke();

      paintBrush = Math.floor(random(0,6));

      paintColor = paintBrushSet[paintBrush][1];
      brushName = paintBrushSet[paintBrush][0];
    
      paintBrushProximityCounter = 0;
    }
  }   
}




// Draws the trail painted from the history
function drawHistory() {
  for (var i = 0; i < history.length; i++) {
    var pos = history[i];
    fill(pos.z);
    ellipse(pos.x, pos.y, 40);
  }
}


// Draws the controllers
function drawControls() {

  if (paintStatus == true) {

    fill("green");
    text("controler off", leftWrist_x+10, leftWrist_y);
  } else {
    fill("red")
    text("controler on", leftWrist_x+10, leftWrist_y);
  }
  // Draws the controller
  ellipse(leftWrist_x, leftWrist_y, 10);
  

  // Draws the airbrush
  fill(paintColor);
  ellipse(rightWrist_x, rightWrist_y, 10);
  text(brushName, rightWrist_x+10, rightWrist_y);

}


// Attaches the drawer to one side
function attachDrawerHand (currentDrawer) {

  if (leftWrist_y < rightWrist_y) {
    paintSide = "left";
  } else {
    paintSide = "right";
  }
}



// Calling the waiting mode, 
// When no one is detected in front of the camera.
function waitingMode(time) {
  
  // If no poses are detected, start remving the first vectors
  if (poses.length == 0) {
     history.shift(v);
  }

  // If no poses are detectect since a long time
  if (poses.length == 0 && time > waitingTimeDuration) {

    color_background_set = Math.floor(random(0,6));
    color_background = paintBrushSet[color_background_set][1];

    waitingSince = 0;
    
  }
}


// RUNWAY - SOCKET.IO RELATED
//Update the canvas with the model status
function modelReady() {
  select('#status').html('Model Loaded');
}

// retreives the full canvas and sends it to Runway with Socket.io
function newDrawing(data){
  if(data && data.output) {
    document.getElementById("empty").src = data.output;
  }
}

// MODEL RELATED
// Retreives the correct color information for both COCO models
function selectColorSet (runwayModelName) {

  if (runwayModelName == "SPADE-COCO") {
    // SPADE-COCO semantic map colors
    paintBrushSet[0] = ["unlabeled", color(0,0,0)]; // default/unlabeled
    paintBrushSet[1] = ["unlabeled2", color(1,1,1)]; // 
    paintBrushSet[2] = ["unlabeled3", color(2,2,2)]; // 
    console.log("semantic map for Model SPADE-COCO selected");

  } else {
    // SPADE-LANDSCAPE semantic map colors
    paintBrushSet[0] = ["unlabeled", color(0,0,0)]; // default/unlabeled
    paintBrushSet[1] = ["grass", color(29,195,49)]; // Grass
    paintBrushSet[2] = ["sky", color(95,219,255)]; // Sky
    paintBrushSet[3] = ["clouds", color(170,170,170)]; // Clouds
    paintBrushSet[4] = ["sea", color(54,62,167)]; // Sea
    paintBrushSet[5] = ["river", color(0,57,150)]; // River
    paintBrushSet[6] = ["tree", color(140,104,47)]; // Tree
    paintBrushSet[7] = ["mountain", color(60,55,50)]; // Mountain
    paintBrushSet["size"] = 7
    console.log("semantic map for Model SPADE-LANDSCAPE selected");
  }
}

// Various stuff
function keyTyped() {
  if (key === 's') {
    saveCanvas('photo', 'png');
  }
}


// Posent Draw Skeleton

// A function to draw the skeletons
function drawSkeleton() {
  // Loop through all the skeletons detected
  for (let i = 0; i < poses.length; i++) {
    let skeleton = poses[i].skeleton;
    // For every skeleton, loop through all body connections
    for (let j = 0; j < skeleton.length; j++) {
      let partA = skeleton[j][0];
      let partB = skeleton[j][1];
      stroke(255, 0, 0);
      line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
    }
  }
}