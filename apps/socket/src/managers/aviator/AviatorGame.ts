import { createId } from "@paralleldrive/cuid2";
import { Bid } from "./AviatorManager";
import { User } from "../users/User";
import crypto from 'crypto'

const AES_KEY = Buffer.from(process.env.AES_KEY!, 'hex');
const AES_IV = Buffer.from(process.env.AES_IV!, 'hex');
const SERVER_SECRET = process.env.SERVER_SECRET!



const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export class AviatorGame{
    private _roomId: string;
    private _isRunning: boolean = false;
    private _waitingTime = 10000; // 10 seconds
    private _players: Map<string, User> = new Map();
    private _biddings: Map<string, Bid> = new Map();
    private _rate: number = 1.00
    private _startTime: number | null = null;
    private _maxRate: number;
    private _interval: NodeJS.Timeout | null = null;
    constructor(roomId: string){
        this._roomId = roomId
        this._maxRate = 5.36;
        this.initializeGame()
    }

    private initializeGame(){
        const data = this._waitingTime.toString();
        this._rate = 1.00
        for(const user of this.players.values()){
            user.socket.emit("AVIATOR_WAITING", data)
        }
        this._startTime = performance.now()
        setTimeout(() => {
            // const maxRate = (Math.random() * (100.00 - 1.01) + 1.01).toFixed(2);
            const rateString = this._maxRate.toString()
            const encryptedRate = this.encryptAES(rateString);
            const serverHash = this.generateHMAC(rateString); 
            this._isRunning = true;
            for(const user of this.players.values()){
                const bid = this.biddings.get(user.userId)
                const message = JSON.stringify({seed: encryptedRate, hash: serverHash, player: !!bid})
                user.socket.emit("START_AVIATOR", message)
            }
            this.startGame()
        }, this._waitingTime);
    }

    public get roomId(){
        return this._roomId;
    }


    public get maxRate(){
        return this._maxRate
    }

    private startGame() {
        if (this._interval) return; // Prevent multiple intervals
    
        this._interval = setInterval(() => {
            if (this._rate >= this._maxRate) {
                clearInterval(this._interval!);
                this._interval = null; // Reset interval
                this.endGame()
                return;
            }
            this._rate = parseFloat((this._rate + 0.01).toFixed(2)); // Increment & fix decimal places
        }, 100);
    }

    public get isRunning(){
        return this._isRunning
    }

    public getCurrentData(){
        return JSON.stringify({currentRate: this.encryptAES(this._rate.toString()), maxRate: this.encryptAES(this._maxRate.toString())})
    }

    public getRemainingWaitingTime(){
        if (this._startTime === null) {
            return this._waitingTime; 
        }
    
        const elapsedTime = performance.now() - this._startTime;
        return Math.max(0, this._waitingTime - elapsedTime);
    }

    public getCurrentRate(){
        return this._rate
    }

    public get biddings(){
        return this._biddings
    }

    public get players(){
        return this._players
    }

    private encryptAES(text: string) {
        let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(AES_KEY), Buffer.from(AES_IV));
        let encrypted = cipher.update(text, "utf8", "base64");
        encrypted += cipher.final("base64");
        return encrypted;
    }
    
    private generateHMAC(data: string) {
        return crypto.createHmac("sha256", SERVER_SECRET).update(data).digest("hex");
    }


    private endGame(){
        this._biddings = new Map();
        this._roomId = createId();
        delay(2000).then(() => {
            this._isRunning = false;
            this.initializeGame();
        })
    }
}