const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hola from doctors portal server');
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tzinyke.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
        if (error) {
            return res.status(403).send({ message: 'Forbiddedn Access' });
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {

    try {
        const AppointsDataCollection = client.db('doctors-portal-db').collection('AppointsData');
        const bookingsCollection = client.db('doctors-portal-db').collection('bookings');
        const usersCollection = client.db('doctors-portal-db').collection('users');
        const doctorsCollection = client.db('doctors-portal-db').collection('doctors');

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send('forbidden Acces');
            }
            next();
        }

        app.get('/appointments', async (req, res) => {
            const query = {};
            const appointments = await AppointsDataCollection.find(query).toArray();
            const date = req.query.date;
            console.log(date)
            const bookingQuery = { selectedDate: date };
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();

            appointments.forEach(appointment => {
                bookedAppointments = alreadyBooked.filter(book => book.treatment === appointment.name);
                bookedSlots = bookedAppointments.map(book => book.slot);
                console.log(bookedSlots);
                remainingSlots = appointment.slots.filter(slot => !bookedSlots.includes(slot));
                appointment.slots = remainingSlots;
                console.log(date, appointment.name, bookedSlots);
            })
            res.send(appointments);
        });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const query = {
                selectedDate: booking.selectedDate,
                patientEmail: booking.patientEmail,
                treatment: booking.treatment
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You already have an appointment on ${booking.selectedDate}`;
                return res.send({ acknowledged: false, message });
            }

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(401).send({ message: 'Unauthorized Access' });
            };
            const query = { patientEmail: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign(
                    { email },
                    process.env.ACCESS_TOKEN,
                    { expiresIn: '1h' }
                )
                return res.send({ accessToken: token });
            };

            res.status(403).send({ message: 'Unauthorised Access' });

        });

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        });

        app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {

            // const decodedEmail = req.decoded.email;
            // const query = { email: decodedEmail };
            // const user = await usersCollection.findOne(query);
            // if (user?.role !== 'admin') {
            //     return res.status(403).send('forbidden Acces');
            // }


            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            };

            const result = await usersCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        });

        app.get('/appointmentspecialty', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const specialties = await AppointsDataCollection.find(query).project({ name: 1 }).toArray();

            res.send(specialties);
        });

        app.post('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const doctor = req.body;
            const result = await doctorsCollection.insertOne(doctor);
            res.send(result);
        });

        app.get('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const result = await doctorsCollection.find(query).toArray();
            res.send(result);
        });

        app.delete('/doctors/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await doctorsCollection.deleteOne(query);
            res.send(result);
        })

    }
    finally {

    }
}

run().catch(err => console.error(err));

app.listen(port, () => {
    console.log('doctors portal server is running on port :', port);
})