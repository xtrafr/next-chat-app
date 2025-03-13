import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import dbConnect from '../../../lib/mongodb'
import User from '../../../models/User'

export default NextAuth({
    jwt: {
        maxAge: parseInt(process.env.SESSION_EXPIRES_IN_MILLISECONDS!) / 1000
    },
    pages: {
        signIn: '/auth/credentials-signin',
        signOut: '/auth/credentials-signin',
    },
    providers: [
        CredentialsProvider({
            credentials: {
                email: { label: "Email", type: "email", placeholder: "Email" },
                password: { label: "Password", type: "password", placeholder: "Password" },
            },
            async authorize(credentials) {
                await dbConnect();
                
                const user = await User.findOne({
                    email: credentials?.email,
                    password: credentials?.password
                }).select('_id username email');

                if (user) {
                    return {
                        id: user._id.toString(),
                        username: user.username,
                        email: user.email
                    };
                }
                return null;
            },
        })
    ],
})