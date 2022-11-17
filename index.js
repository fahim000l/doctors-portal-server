const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
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

async function run() {

    try {
        const AppointsDataCollection = client.db('doctors-portal-db').collection('AppointsData');
        const bookingsCollection = client.db('doctors-portal-db').collection('bookings');

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


    }
    finally {

    }
}

run().catch(err => console.error(err));

app.listen(port, () => {
    console.log('doctors portal server is running on port :', port);
})