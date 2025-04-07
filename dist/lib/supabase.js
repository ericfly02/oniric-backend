"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByEmail = exports.getUserById = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Service Key. Please check your environment variables.');
}
// Create a Supabase client with the service key for server-side operations
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
// Function to get user data by ID
const getUserById = async (userId) => {
    const { data, error } = await exports.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) {
        throw new Error(`Error fetching user: ${error.message}`);
    }
    return data;
};
exports.getUserById = getUserById;
// Function to get user data by email
const getUserByEmail = async (email) => {
    const { data, error } = await exports.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    if (error && error.code !== 'PGRST116') {
        throw new Error(`Error fetching user by email: ${error.message}`);
    }
    return data;
};
exports.getUserByEmail = getUserByEmail;
exports.default = exports.supabase;
//# sourceMappingURL=supabase.js.map