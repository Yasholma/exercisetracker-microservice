const express = require("express");
const app = express();
const bodyParser = require("body-parser");
require("dotenv").config();
const shortid = require("shortid");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(process.env.MLAB_URI || "mongodb://localhost/exercise-track", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
});

// Schemas
const userSchema = mongoose.Schema({
    _id: {
        type: String,
        default: shortid.generate,
    },
    username: String,
});

const exerciseSchema = mongoose.Schema({
    _id: {
        type: String,
        default: shortid.generate,
    },
    userId: String,
    description: String,
    duration: String,
    date: String,
});

// Models
const User = mongoose.model("users", userSchema);
const Exercise = mongoose.model("exercises", exerciseSchema);

app.post("/api/exercise/new-user", (req, res) => {
    const username = req.body.username;
    if (!username) {
        res.status(400).send({ error: "Username is required" });
    }
    const user = new User({
        username: username,
    });
    // check if user already exist
    User.findOne({ username: username }, (e, u) => {
        if (e) res.status(500).send({ error: "network error" });
        if (!u) {
            user.save((err, usr) => {
                if (err) res.status(500).send({ error: "error creating user" });
                res.status(201).send(usr);
            });
        } else {
            res.status(403).send({
                message: `User already exist.`,
            });
        }
    });
    return;
});

// Add Exercise and assigning
app.post("/api/exercise/add", (req, res) => {
    const userId = req.body.userId;
    const description = req.body.description;
    const duration = req.body.duration;
    const date = req.body.date;

    const datetime = new Date(date).toDateString();

    if (!userId || !description || !duration || !date) {
        return res.status(400).send({ message: "all fields are required" });
    }

    if (description.length >= 50) {
        return res.status(400).send({ message: "description is too long" });
    }

    // check for user in the database
    User.findById(userId, (error, user) => {
        if (error) res.send({ status: 500, message: "network issue" });
        if (user) {
            const exercise = new Exercise({
                userId: userId,
                description: description,
                duration: duration,
                date: datetime,
            });
            exercise.save((err, exe) => {
                if (err) res.send({ status: 500, message: "network issue" });
                res.status(201).send({
                    _id: exe._id,
                    description,
                    duration,
                    datetime,
                    userId,
                });
            });
        } else {
            res.status(500).send("unknown _id");
            return;
        }
    });

    return;
});

// [&from][&to][&limit]

// Get User Exercise Info
app.get("/api/exercise/log/:userId/:from?/:to?/:limit?", (req, res) => {
    console.log(req.params);

    let { userId, from, to, limit } = req.params;

    from = new Date(from).toDateString();
    to = new Date(to).toDateString();

    Exercise.find({ userId: userId })
        .limit(limit)
        .exec((err, data) => {
            if (err) return res.send({ status: 404, message: "No Data" });
            return res.send(data);
        });
    return;
});

// Not found middleware
app.use((req, res, next) => {
    return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
    let errCode, errMessage;

    if (err.errors) {
        // mongoose validation error
        errCode = 400; // bad request
        const keys = Object.keys(err.errors);
        // report the first validation error
        errMessage = err.errors[keys[0]].message;
    } else {
        // generic or custom error
        errCode = err.status || 500;
        errMessage = err.message || "Internal Server Error";
    }
    res.status(errCode).type("txt").send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
