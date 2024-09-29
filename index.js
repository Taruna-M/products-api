const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
const allowedOrigins = ['https://products-chi-blue.vercel.app'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    credentials: true
}));


dotenv.config();
const PORT = process.env.PORT;
const MONGODB = process.env.MONGODB;
const JWT = process.env.JWT;

app.use(express.json());

mongoose.connect(MONGODB, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected!"))
    .catch(err => console.error("MongoDB connection error:", err));


const userSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true
    }
})

const User = mongoose.model("User", userSchema);

const schema = new mongoose.Schema({
    Prod_ID: {
        type: String,
        required: true,
        unique: true
    },
    Name: {
        type: String,
        required: true
    },
    Price: {
        type: Number,
        required: true
    },
    Featured: {
        type: Boolean,
        default: false
    },
    Rating: {
        type: Number,
        default: 0.0
    },
    CreatedAt: {
        type:Date,
        required: true,
        default: Date.now
    },
    Company: {
        type: String,
        required: true
    }
});

const Product = mongoose.model('Products',schema);

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token.' });
    }
};

app.post('/signUp', async (req, res) => {
    const { email, password } = req.body;
    try {
        const exist = await User.findOne({ email });
        if (exist) return res.status(400).json({ error: 'exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: 'created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'invalid' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'invalid' });

        const token = jwt.sign({ id: user._id, email: user.email }, JWT, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/addProd',authMiddleware,async(req,res)=>{
    try{

        const prod = new Product(req.body);
        const id = req.body.Prod_ID;
        const productExist = await Product.findOne({Prod_ID:id});
        if (productExist) return res.status(400).json({error:"exists"});

        await prod.save();
        res.status(201).json({message:"added"});
    }
    catch(err){
        res.status(400).json({error:err.message});
    }
});

app.get('/getProds',async(req,res)=>{
   try{
    const products = await Product.find();
    res.json(products);
   }
   catch(err){
    res.status(500).json({error:err.message});
   }
});

app.get('/getProds/:id', async (req, res) => {
    try {
        const product = await Product.findById({_id: req.params.id}); 
        if (!product) return res.status(404).json({ error: "not found" });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/updateProd/:id',authMiddleware,async(req,res)=>{
    try{
        const id = req.params.id;
        const prod = await Product.findByIdAndUpdate(id,req.body,{new: true});
        if(!prod) return res.status(404).json({error:"not found"});
        res.json(prod);
    }
    catch(err){
        res.status(400).json({error:err.message});
    }
})

app.delete('/deleteProd/:id',authMiddleware,async(req,res)=>{
    try{
        const id = req.params.id;
        const prod = await Product.findByIdAndDelete(id);
        if(!prod) return res.status(404).json({error:"not found"});
        res.json({message:"deleted"});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
});

app.get('/getFeaturedProd',async(req,res)=>{
    try{
        const prods = await Product.find({Featured: true});
        res.json(prods);
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
});

app.get('/getByPrice/:price',async(req,res)=>{
    try{
        const price = req.params.price;
        const prods = await Product.find({Price: {$lt: price}});
        res.json(prods);
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
});

app.get('/getByRating/:rating',async(req,res)=>{
    try{
        const rating = req.params.rating;
        const prods = await Product.find({Rating: {$gt: rating}});
        res.json(prods);
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
});

app.listen(PORT,()=>{
    console.log("db connected")
});
