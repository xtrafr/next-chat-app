import { NextApiRequest, NextApiResponse } from "next";
import { Server } from "socket.io";
import { getToken } from "next-auth/jwt";
import dbConnect from "../../lib/mongodb";
import User from "../../models/User";
import Message from "../../models/Message";

let onlineUserEmails: string[] = [];

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const token = await getToken({ req });
    if (!token)
        return res.status(401).json({ message: 'Unauthorized' });

    await dbConnect();

    if (!(<any>res!.socket)!.server.io) {
        const io = new Server((<any>res.socket).server);
        (<any>res.socket).server.io = io;

        io.on('connection', async socket => {
            setTimeout(() => {
                socket.emit('expired');
                socket.disconnect();
            }, parseInt(process.env.SESSION_EXPIRES_IN_MILLISECONDS!));

            if (!onlineUserEmails.includes(socket.handshake.query.email as string))
                onlineUserEmails = [...onlineUserEmails, socket.handshake.query.email as string];

            socket.broadcast.emit('user connect', { email: socket.handshake.query.email });

            socket.on('disconnect', () => {
                onlineUserEmails = onlineUserEmails.filter(email => email !== socket.handshake.query.email);
                socket.broadcast.emit('user disconnect', { email: socket.handshake.query.email });
            });

            try {
                const messages = await Message.find()
                    .populate('userId', 'email')
                    .sort({ dateTime: 1 });

                const formattedMessages = messages.map(msg => ({
                    id: msg._id,
                    dateTime: msg.dateTime,
                    text: msg.text,
                    email: msg.userId.email
                }));

                socket.emit('get all messages', { 
                    messages: formattedMessages, 
                    onlineUsers: onlineUserEmails 
                });

                socket.on('post message', async message => {
                    try {
                        const user = await User.findOne({ email: socket.handshake.query.email });
                        if (!user) {
                            console.error('User not found');
                            return;
                        }

                        const newMessage = await Message.create({
                            userId: user._id,
                            dateTime: new Date(),
                            text: message
                        });

                        socket.broadcast.emit('new message', {
                            email: socket.handshake.query.email,
                            text: message
                        });
                    } catch (error) {
                        console.error("Post chat error:", error);
                    }
                });

                socket.on("typing", () => {
                    socket.broadcast.emit("typing", { email: socket.handshake.query.email });
                });
            } catch (error) {
                console.error("Socket connection error:", error);
            }
        });
    }
    res.end();
}

export default handler;