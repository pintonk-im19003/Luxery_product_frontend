// Initializing the variables
const express = require('express');
const app = express();
const cors = require('cors');
const https =require('https');
const fs = require('fs');
const db = require('./models');
const { User, Category } = require('./models');
const bcrypt = require('bcrypt');
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const { spawn } = require('child_process');
const path = require('path'); 


// then express and cors
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

// this for the cookies
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:true }));
app.use(session({
    key: "userId",
    // this for development
    secret: "tempsecret",
    resave: false,
    saveUninitialized:false,
    cookie: {
        // cookie expires in 8 hours
        expires: 60 * 60 * 8,
    },
}));

// Routers
const itemRouter = require('./routes/Items');
app.use("/items", itemRouter);
const bidRouter = require('./routes/Bids');
app.use("/bids", bidRouter);
const userRouter = require('./routes/Users');
app.use("/auth", userRouter);
const mailRouter = require('./routes/Mail');
app.use("/mail", mailRouter);
const categoryRouter = require('./routes/Categories');
app.use("/categories", categoryRouter);
const historyRouter = require('./routes/History');
app.use("/history", historyRouter);
const photographyRouter = require('./routes/Photos');
app.use("/photos", photographyRouter);
app.use('/images/', express.static('images'));


// API endpoint for matrix factorization
app.get("/api/matrixFactorization", (req, res) => {
    // Assuming you have the required data (Ratings) from the database or any other source
    const Ratings = [
        [5, 3, 0, 1],
        [4, 0, 0, 1],
        [1, 1, 0, 5],
        [1, 0, 0, 4],
    ]; // Replace this with your data
  
    // Call the Python script using a child process
    const pythonProcess = spawn('python', [path.join(__dirname, 'recommender/matrix_factorization.py')]);
  
    let result = ""; // To store the output from the Python script
  
    // Send the Ratings data to the Python script through standard input
    pythonProcess.stdin.write(JSON.stringify(Ratings));
    pythonProcess.stdin.end();
  
    // Capture the output from the Python script
    pythonProcess.stdout.on('data', (data) => {
      result += data;
    });
  
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python error: ${data}`);
    });
  
    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      // Process the result here if needed
      const parsedResult = JSON.parse(result);
      res.status(200).json({ message: "Matrix factorization completed successfully!", result: parsedResult });
    });
  });



// Create the ssl server
const sslServer = https.createServer({
    key: fs.readFileSync('C:/Program Files/OpenSSL-Win64/tests/recipes/04-test_pem_reading_data/key.pem'),
    cert: fs.readFileSync('C:/Program Files/OpenSSL-Win64/tests/recipes/04-test_pem_reading_data/cert.pem')
}, app);

// listen on port 33123 creating the tables in models in the process
db.sequelize.sync({ force: false, alter:true}).then(()=>{
    console.log("Encrypted server up and running\nConnected to database");

    // create the admin, if they do not already exist
    const password="1234";
    bcrypt.hash(password, 10).then((hash)=>{
        User.create({
            username: "admin",
            password: hash,
            name: "admin",
            admin: true,
            approved: true,
        }).catch(err => {
            console.log("Already exists");
        });
    });

    // Creating the basic "parent" category of the app
    Category.create({
        name: "All Categories",
    }).catch(err => {
        console.log("Already set up");
    });

    sslServer.listen(33123, ()=>{
        console.log("Listening on port: 33123");
    });
});


