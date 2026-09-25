import mongoose from 'mongoose';
import config from './config.js';

const connectDB = async () => {
 console.log(config.dbUri);
    await mongoose.connect(config.dbUri);
    console.log('Connected to MongoDB');
 
};

export default connectDB;