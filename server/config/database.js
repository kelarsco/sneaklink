import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
// This ensures we load from the correct directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Also try loading from root if server/.env doesn't exist
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
}

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set in environment variables!');
      console.error('   Please check your .env file in the server directory.');
      console.error('   Make sure you have created server/.env with your MongoDB connection string.');
      console.error('   Current working directory:', process.cwd());
      console.error('   Looking for .env in:', path.join(__dirname, '..', '.env'));
      process.exit(1);
    }

    // Validate MongoDB URI format
    const mongoUri = process.env.MONGODB_URI.trim();
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      console.error('❌ Invalid MONGODB_URI format!');
      console.error('   Must start with mongodb:// or mongodb+srv://');
      console.error('   Current value:', mongoUri.substring(0, 20) + '...');
      process.exit(1);
    }

    // Check if already connected - prevent duplicate connections
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB already connected (reusing existing connection)');
      return mongoose.connection;
    }
    
    // If connecting, wait for it to complete instead of creating new connection
    if (mongoose.connection.readyState === 2) {
      console.log('⏳ MongoDB connection in progress, waiting...');
      // Wait up to 30 seconds for connection to complete
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (mongoose.connection.readyState === 1) {
          console.log('✅ MongoDB connection completed');
          return mongoose.connection;
        }
        if (mongoose.connection.readyState === 0) {
          break; // Connection failed, proceed with new connection
        }
      }
    }

    console.log('🔄 Attempting to connect to MongoDB...');
    const maskedUri = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`   URI: ${maskedUri}`);
    console.log(`   Database: ${mongoUri.match(/\/\/([^\/]+)\/([^?]+)/)?.[2] || 'default'}`);
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds for more reliable connection
      socketTimeoutMS: 60000, // 60 seconds socket timeout (increased for stability)
      connectTimeoutMS: 30000, // 30 seconds connection timeout (increased for stability)
      maxPoolSize: 50, // Increased pool size for better concurrency
      minPoolSize: 10, // Maintain at least 10 socket connections (increased for stability)
      // Auto-reconnect options
      retryWrites: true,
      retryReads: true,
      // Enable automatic reconnection
      autoIndex: true,
      // Keep buffering enabled so commands queue when disconnected
      // bufferCommands defaults to true, which allows Mongoose to buffer
      // commands until connection is ready
      // Optimize for PERMANENT connection stability
      maxIdleTimeMS: 0, // NEVER close idle connections (0 = disabled) - keeps connection permanent
      heartbeatFrequencyMS: 30000, // Check connection health every 30 seconds (reduced frequency)
      // Keep connections alive
      keepAlive: true,
      keepAliveInitialDelay: 30000, // Send keepalive after 30 seconds of inactivity
      // Connection monitoring
      monitorCommands: false, // Disable command monitoring to reduce overhead
    });
    
    console.log(`✅ MongoDB Connected successfully!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Ready State: ${conn.connection.readyState} (1=connected)`);
    
    // Handle connection events with PERMANENT connection management
    // Prevent duplicate event listeners by checking if already set up
    if (!mongoose.connection._events || !mongoose.connection._events.connected) {
      let reconnectAttempts = 0;
      let reconnectTimer = null;
      let isReconnecting = false;
      let lastDisconnectTime = null;
      
      mongoose.connection.on('error', (err) => {
        // Only log non-critical errors to avoid spam
        if (!err.message.includes('buffering timed out')) {
          console.error('❌ MongoDB connection error:', err.message);
        }
        // Mongoose will automatically attempt to reconnect - don't interfere
      });
      
      mongoose.connection.on('disconnected', () => {
        const now = Date.now();
        
        // Prevent rapid disconnect/reconnect loops
        if (lastDisconnectTime && (now - lastDisconnectTime) < 5000) {
          // Disconnected too recently, might be a loop - wait longer
          return;
        }
        lastDisconnectTime = now;
        
        // Only log if not already reconnecting
        if (!isReconnecting) {
          console.warn('⚠️  MongoDB disconnected. Auto-reconnecting...');
        }
        
        // Clear any existing reconnect timer
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        
        // Mongoose has built-in auto-reconnect, but we'll add additional retry logic
        // Only if connection is actually disconnected (readyState 0)
        if (mongoose.connection.readyState === 0 && !isReconnecting) {
          isReconnecting = true;
          reconnectAttempts++;
          const delay = Math.min(3000 * reconnectAttempts, 60000); // Exponential backoff, max 60s
          
          reconnectTimer = setTimeout(async () => {
            try {
              // Double-check connection state before attempting reconnect
              if (mongoose.connection.readyState === 0) {
                console.log(`🔄 Auto-reconnect attempt ${reconnectAttempts}...`);
                await mongoose.connect(mongoUri, {
                  serverSelectionTimeoutMS: 30000,
                  socketTimeoutMS: 60000,
                  connectTimeoutMS: 30000,
                  maxPoolSize: 50,
                  minPoolSize: 10,
                  retryWrites: true,
                  retryReads: true,
                  maxIdleTimeMS: 0, // Keep connection permanent
                  heartbeatFrequencyMS: 30000,
                  keepAlive: true,
                  keepAliveInitialDelay: 30000,
                });
                reconnectAttempts = 0; // Reset on successful reconnect
                reconnectTimer = null;
                isReconnecting = false;
                lastDisconnectTime = null;
                console.log('✅ MongoDB reconnected successfully!');
              } else {
                // Already connected, cancel reconnection
                isReconnecting = false;
                reconnectTimer = null;
                lastDisconnectTime = null;
              }
            } catch (reconnectError) {
              console.warn(`⚠️  Reconnect attempt ${reconnectAttempts} failed:`, reconnectError.message);
              reconnectTimer = null;
              isReconnecting = false;
              // Mongoose will continue trying automatically
            }
          }, delay);
        }
      });
      
      mongoose.connection.on('reconnected', () => {
        reconnectAttempts = 0; // Reset counter
        isReconnecting = false;
        lastDisconnectTime = null;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        console.log('✅ MongoDB reconnected successfully!');
      });
      
      // Handle reconnection attempts
      mongoose.connection.on('connecting', () => {
        if (!isReconnecting) {
          console.log('🔄 MongoDB connecting...');
        }
      });

      // Handle initial connection
      mongoose.connection.on('connected', () => {
        reconnectAttempts = 0;
        isReconnecting = false;
        lastDisconnectTime = null;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        console.log('✅ MongoDB connection established and STABLE');
      });
      
      // Monitor connection state periodically to ensure it stays connected
      setInterval(() => {
        const state = mongoose.connection.readyState;
        if (state === 0 && !isReconnecting) {
          // Connection lost, trigger reconnect
          console.warn('⚠️  Connection state check: Disconnected. Triggering reconnect...');
          mongoose.connection.emit('disconnected');
        }
      }, 60000); // Check every 60 seconds
    }
    
    return conn;
  } catch (error) {
    console.error('\n❌ Error connecting to MongoDB:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Name: ${error.name}`);
    
    // Provide helpful error messages
    if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
      console.error('\n💡 Authentication failed. Check:');
      console.error('   - Username and password in MONGODB_URI');
      console.error('   - Password should be URL-encoded (e.g., @ becomes %40)');
      console.error('   - Database user exists in MongoDB Atlas');
      console.error('   - User has proper permissions');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Network/DNS error. Check:');
      console.error('   - Internet connection');
      console.error('   - MongoDB Atlas cluster is running');
      console.error('   - Cluster hostname is correct');
      console.error('   - DNS resolution is working');
    } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.error('\n💡 IP whitelist error. Check:');
      console.error('   - Your IP address is whitelisted in MongoDB Atlas');
      console.error('   - Go to: Network Access → Add IP Address');
      console.error('   - For development, you can use 0.0.0.0/0 (allows all IPs)');
      console.error('   - Wait a few minutes after adding IP for changes to propagate');
    } else if (error.message.includes('timeout') || error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Connection timeout. Check:');
      console.error('   - Internet connection');
      console.error('   - Firewall settings');
      console.error('   - MongoDB Atlas cluster status');
      console.error('   - VPN might be blocking connection');
    } else if (error.message.includes('SRV') || error.message.includes('DNS')) {
      console.error('\n💡 DNS/SRV error. Check:');
      console.error('   - Using mongodb+srv:// for Atlas clusters');
      console.error('   - DNS resolution is working');
      console.error('   - Cluster hostname is correct');
    } else {
      console.error('\n💡 Troubleshooting steps:');
      console.error('   1. Verify MONGODB_URI in .env file (server/.env)');
      console.error('   2. Check MongoDB Atlas dashboard');
      console.error('   3. Ensure IP is whitelisted');
      console.error('   4. Verify database user credentials');
      console.error('   5. Test connection string in MongoDB Compass');
      console.error('   6. Check if cluster is paused (free tier clusters pause after inactivity)');
    }
    
    console.error(`\n   Full error: ${error}`);
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error(`\n   Stack: ${error.stack}`);
    }
    
    // Don't exit immediately - allow server to start
    // The server can run but scraping won't work until DB is connected
    console.error('\n⚠️  Server will start but scraping will be disabled until database connection is fixed.');
    throw error; // Re-throw so caller can handle
  }
};

export default connectDB;
