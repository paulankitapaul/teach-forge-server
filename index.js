require('dotenv').config();
const express = require('express');
const cors = require('cors');
// const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p6ng1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const userCollection = client.db('teachDB').collection('users');
        // const scholarCollection = client.db('teachDB').collection('scholars');
        // const appliedCollection = client.db('teachDB').collection('applied');
        // const reviewCollection = client.db('teachDB').collection('reviews');


        // jwt api's
        // app.post('/jwt', async (req, res) => {
        //     const user = req.body;
        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '2h' });
        //     res.send({ token });
        // });


        // middlewares
        // const verifyToken = (req, res, next) => {
        //     if (!req.headers.authorization) {
        //         return res.status(401).send({ message: 'unauthorize access' });
        //     }

        //     const token = req.headers.authorization.split(' ')[1]
        //     jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        //         if (err) {
        //             return res.status(401).send({ message: 'unauthorize access' });
        //         }
        //         req.decoded = decoded;
        //         next();
        //     })
        // };


        // user api's
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/users/role/:email', async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' });
            };

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            let teacher = false;
            if (user) {
                admin = user?.role === 'admin';
                teacher = user?.role === 'teacher';
            };
            res.send({ admin, teacher });

        });

        app.post('/users', async (req, res) => {
            const user = req.body;

            const query = { email: user.email };
            const exitingUser = await userCollection.findOne(query);
            if (exitingUser) {
                return res.send({ massage: 'User already exists', insertedId: null })
            }

            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.patch('/users/role/:id', async (req, res) => {
            const id = req.params.id;
            const { role } = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });


        // // scholar related api's
        // app.get('/scholar', async (req, res) => {
        //     const result = await scholarCollection.find().toArray();
        //     res.send(result);
        // });
        // app.get('/scholar/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) };
        //     const result = await scholarCollection.findOne(query);
        //     res.send(result);
        // });

        // app.post('/scholar', verifyToken, async (req, res) => {
        //     const item = req.body;
        //     const result = await scholarCollection.insertOne(item);
        //     res.send(result);
        // });

        // app.patch('/scholar/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const updates = req.body;

        //     const filter = { _id: new ObjectId(id) };
        //     const updateItem = {
        //         $set: {
        //             scholarshipName: updates.scholarshipName,
        //             applicationDeadline: updates.applicationDeadline,
        //             applicationFees: updates.applicationFees,
        //             postedEmail: updates.postedEmail,
        //             scholarshipCategory: updates.scholarshipCategory,
        //             scholarshipPostDate: updates.scholarshipPostDate,
        //             serviceCharge: updates.serviceCharge,
        //             subjectCategory: updates.subjectCategory,
        //             tuitionFees: updates.tuitionFees,
        //             universityCity: updates.universityCity,
        //             universityCountry: updates.universityCountry,
        //             universityName: updates.universityName,
        //             universityRank: updates.universityRank
        //         }
        //     };

        //     const result = await scholarCollection.updateOne(filter, updateItem);
        //     res.send(result);
        // });


        // app.delete('/scholar/:id', verifyToken, async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) };
        //     const result = await scholarCollection.deleteOne(query);
        //     res.send(result);
        // });

        // // applied related api's
        // app.get('/scholarApplied', async (req, res) => {
        //     const email = req.query.email;
        //     const query = { userEmail: email };
        //     const result = await appliedCollection.find(query).toArray();
        //     res.send(result);
        // });

        // app.post('/scholarApplied', verifyToken, async (req, res) => {
        //     const item = req.body;
        //     const result = await appliedCollection.insertOne(item);
        //     res.send(result);
        // });

        // app.delete('/scholarApplied/:id', verifyToken, async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) };
        //     const result = await appliedCollection.deleteOne(query);
        //     res.send(result);
        // });


        // // review related api's
        // app.get('/reviews', async (req, res) => {
        //     const email = req.query.email;
        //     const query = email ? { userEmail: email } : {};
        //     const result = await reviewCollection.find(query).toArray();
        //     res.send(result);
        // })

        // app.post('/reviews', async (req, res) => {
        //     const item = req.body;
        //     const result = await reviewCollection.insertOne(item);
        //     res.send(result);
        // });

        // app.patch('/reviews/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const reviewData = req.body;
        //     const filter = { _id: new ObjectId(id) };
        //     const updateReview = {
        //         $set: {
        //             rating: reviewData.rating,
        //             comment: reviewData.comment,
        //             date: reviewData.date
        //         }
        //     };

        //     const result = await reviewCollection.updateOne(filter, updateReview);
        //     res.send(result);
        // });


        // app.delete('/reviews/:id', async (req, res) => {
        //     const reviewId = req.params.id;
        //     const query = { _id: new ObjectId(reviewId) };
        //     const result = await reviewCollection.deleteOne(query);
        //     res.send(result);
        // });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Teach Forge');
});

app.listen(port, () => {
    console.log(`Server Running on Port: ${port}`);
})