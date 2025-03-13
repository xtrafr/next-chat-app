import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import dbConnect from '../../../lib/mongodb'
import User from '../../../models/User'

// Extend the built-in session types
declare module "next-auth" {
    interface User {
        username?: string;
    }
    interface Session {
        user: {
            username?: string;
            email?: string | null;
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        username?: string;
    }
}

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
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                await dbConnect();
                
                try {
                    const user = await User.findOne({
                        email: credentials.email.toLowerCase()
                    });

                    if (!user) {
                        return null;
                    }

                    // Simple password comparison (since the original app stored plain passwords)
                    const isValidPassword = user.password === credentials.password;

                    if (!isValidPassword) {
                        return null;
                    }

                    return {
                        id: user._id.toString(),
                        username: user.username,
                        email: user.email
                    };
                } catch (error) {
                    console.error('Auth error:', error);
                    return null;
                }
            },
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.username = user.username;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.username = token.username;
            }
            return session;
        }
    }
})