import { Socket } from "socket.io";
export class User{
    private readonly _userId: string;
    private readonly _socket: Socket;
    private readonly _username: string;
    constructor(userId: string, socket: Socket, username: string) {
        this._userId = userId;
        this._socket = socket;
        this._username = username;
    }

    public get socket(){
        return this._socket;
    }

    public get userId(){
        return this._userId;
    }

    public get username(){
        return this._username;
    }
}