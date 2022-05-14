"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const fs = __importStar(require("fs"));
const pm_1 = require("../geometry/pm");
const port = 3000;
let vertices;
let indices;
vertices = [];
indices = [];
class App {
    constructor(port) {
        this.clients = {};
        this.port = port;
        const app = (0, express_1.default)();
        app.use(express_1.default.static(path_1.default.join(__dirname, '../client')));
        this.server = new http_1.default.Server(app);
        this.io = new socket_io_1.Server(this.server);
        this.io.on('connection', (socket) => {
            console.log(socket.constructor.name);
            this.clients[socket.id] = {};
            console.log(this.clients);
            console.log('a user connected : ' + socket.id);
            //socket.emit('id', socket.id)
            socket.on('request mesh', (msg) => {
                var path = './dist/models/' + msg + '.obj';
                fs.readFile(path, 'utf-8', (err, data) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    //socket.emit('stream mesh data', data);
                    //parseFile(data);
                    let pmesh = new pm_1.PMesh(data);
                    pmesh.verts.forEach(v => {
                        vertices.push(v.position.x);
                        vertices.push(v.position.y);
                        vertices.push(v.position.z);
                    });
                    pmesh.faces.forEach(f => {
                        indices.push(f.halfedge.vert.idx);
                        indices.push(f.halfedge.next.vert.idx);
                        indices.push(f.halfedge.next.next.vert.idx);
                    });
                    socket.emit('stream vertices', vertices);
                    socket.emit('stream indices', indices);
                });
            });
            /*
                        socket.on('disconnect', () => {
                            console.log('socket disconnected : ' + socket.id)
                            if (this.clients && this.clients[socket.id]) {
                                console.log('deleting ' + socket.id)
                                delete this.clients[socket.id]
                                this.io.emit('removeClient', socket.id)
                            }
                        })
            
                        socket.on('update', (message: any) => {
                            if (this.clients[socket.id]) {
                                this.clients[socket.id].t = message.t //client timestamp
                                this.clients[socket.id].p = message.p //position
                                this.clients[socket.id].r = message.r //rotation
                            }
                        })*/
        });
        /*
                setInterval(() => {
                    this.io.emit('clients', this.clients)
                }, 50)*/
    }
    Start() {
        this.server.listen(this.port, () => {
            console.log(`Server listening on port ${this.port}.`);
        });
    }
}
function parseFile(file) {
    //adapted from geometry processing homework skeleton 
    const lines = file.split('\n');
    for (let line of lines) {
        line = line.trim();
        const tokens = line.split(' ');
        switch (tokens[0].trim()) {
            case 'v':
                //only load vertices
                for (let i = 1; i < tokens.length; i++) {
                    const vv = tokens[i].split('/');
                    vertices.push(parseFloat(vv[0]) - 1);
                }
                break;
            case 'f':
                //only load indices of vertices
                for (let i = 1; i < tokens.length; i++) {
                    const vv = tokens[i].split('/');
                    indices.push(parseInt(vv[0]) - 1);
                }
                break;
        }
    }
}
new App(port).Start();
