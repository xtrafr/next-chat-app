import type { NextApiRequest, NextApiResponse } from 'next'
import dbConnect from '../../lib/mongodb'
import User from '../../models/User'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await dbConnect();
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        // Check if user exists
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() }, 
                { username }
            ]
        });

        if (existingUser) {
            return res.status(409).json({ message: "User with the given email or username exists" });
        }

        // Create new user
        const user = await User.create({
            email: email.toLowerCase(),
            username,
            password
        });

        return res.status(201).json({ message: 'Created', user: { email, username } });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
