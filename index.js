require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
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
        const teacherCollection = client.db('teachDB').collection('requests');
        const classCollection = client.db('teachDB').collection('classes');
        const enrollCollection = client.db('teachDB').collection('enrolls');


        // jwt api's
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '2h' });
            res.send({ token });
        });


        // middlewares
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorize access' });
            }

            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorize access' });
                }
                req.decoded = decoded;
                next();
            })
        };


        // user api's
        app.get('/users', verifyToken, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/users/role/:email', verifyToken, async (req, res) => {
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

        app.patch('/users/role/:id', verifyToken, async (req, res) => {
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

        app.delete('/users/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });


        // teacher-request related api's
        app.get('/teacher-requests/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const result = await teacherCollection.findOne({ email });
            res.send(result);
        });

        app.get('/teacher-requests', verifyToken, async (req, res) => {
            const result = await teacherCollection.find().toArray();
            res.send(result);
        });

        app.post('/teacher-requests', verifyToken, async (req, res) => {
            const item = req.body;
            const existing = await teacherCollection.findOne({ email: item.email });

            if (existing && existing.status !== 'rejected') {
                return res.status(400).send({ message: "You already submitted a request." });
            }

            const result = await teacherCollection.insertOne(item);
            res.send(result);
        });

        app.patch('/teacher-requests/approve/:id', async (req, res) => {
            const id = req.params.id;
            const result = await teacherCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: "accepted" } }
            );
            await userCollection.updateOne(
                { email: req.body.email },
                { $set: { role: "teacher" } }
            );
            res.send(result);
        });

        app.patch('/teacher-requests/reject/:id', async (req, res) => {
            const id = req.params.id;
            const result = await teacherCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: "rejected" } }
            );
            res.send(result);
        })

        // class related api's
        app.get('/classes/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const result = await classCollection.find({ email }).toArray();
            res.send(result);
        });

        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        });

        app.post('/classes', verifyToken, async (req, res) => {
            const newClass = req.body;
            const result = await classCollection.insertOne(newClass);
            res.send(result);
        });

        app.patch('/classes/approve/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: { status: 'accepted' } };
            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.patch('/classes/reject/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: { status: 'rejected' } };
            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.patch('/classes/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const updated = req.body;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    title: updated.title,
                    price: updated.price,
                    description: updated.description,
                    image: updated.image
                }
            };

            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.delete('/classes/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.deleteOne(query);
            res.send(result);
        });



        //  enroll related api's
        app.get('/enroll/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const result = await enrollCollection.find({ email }).toArray();
            res.send(result);
        });

        app.post('/enroll', verifyToken, async (req, res) => {
            const enrollment = req.body;

            const existing = await enrollCollection.findOne({
                classId: enrollment.classId,
                email: enrollment.email
            });

            if (existing) {
                return res.status(400).send({ message: 'Already enrolled in this class' });
            }

            const result = await enrollCollection.insertOne(enrollment);

            await classCollection.updateOne(
                { _id: new ObjectId(enrollment.classId) },
                { $inc: { enrollment: 1 } }
            );

            res.send(result);
        });


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