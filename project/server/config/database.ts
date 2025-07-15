import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root directory
dotenv.config({ path: join(__dirname, '../../.env') });

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    console.log('Checking environment variables...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('MONGODB_URI exists:', !!mongoURI);
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      console.error('Please check your .env file in the root directory');
      console.error('Expected format: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
      process.exit(1);
    }

    // Mongoose connection options (optional for v6+)
    const options = {
      serverSelectionTimeoutMS: 5000,
    };

    console.log('🔄 Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(mongoURI, options);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error: any) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('🔐 Authentication failed. Please check your username and password in the MongoDB URI.');
    } else if (error.message.includes('network')) {
      console.error('🌐 Network error. Please check your internet connection and MongoDB Atlas network access.');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🔍 DNS resolution failed. Please check your MongoDB cluster URL.');
    }
    
    process.exit(1);
  }
};

export default connectDB;