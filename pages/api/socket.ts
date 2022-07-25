import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { Server } from "socket.io";
import seed from "../../db/db";
// @ts-ignore
import Database from "sqlite-async";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession({ req });
    if (!session)
        return res.status(401).json({ message: 'Unauthorized' });
    if (!(<any>res!.socket)!.server.io) {
        const io = new Server((<any>res.socket).server);
        (<any>res.socket).server.io = io;
        io.on('connection', async socket => {
            const db = await Database.open('chatsdb.db');
            await seed(db);
            const messages = await db.all(`SELECT [messages].[id], [dateTime], [text], [email]
                                             FROM [messages]
                                       INNER JOIN [users] ON [users].id = [messages].[userId]
                                         ORDER BY [messages].[id] DESC`);
            socket.emit('get-all-messages', messages.reverse());
            socket.on('send-message', async message => {
                const db = await Database.open('chatsdb.db');
                await seed(db);
                try {
                    const user = await db.get(`SELECT [id]
                                                 FROM [users]
                                                WHERE email = ?
                                                LIMIT 1`, [socket.handshake.query.email]);
                    await db.run(`INSERT INTO [messages] ([userId], [dateTime], [text])
                                       VALUES (?, ?, ?)`, [user.id, + new Date(), message]);
                    const messages = await db.all(`SELECT [messages].[id], [dateTime], [text], [email]
                                                     FROM [messages]
                                               INNER JOIN [users] ON [users].id = [messages].[userId]
                                                 ORDER BY [messages].[id] DESC`);
                    socket.broadcast.emit('get-all-messages', messages.reverse());
                } catch (error) {
                    console.log("Post chat error: " + error);
                }
            })
        });
    }
    res.end();
}

export default handler;