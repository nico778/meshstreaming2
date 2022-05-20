import express from 'express'
import path from 'path'
import http from 'http'
import { Server, Socket } from 'socket.io'
import * as fs from 'fs';
import {PMesh} from '../geometry/pm';

const port: number = 3000;

let vertices: number[];
let indices: number[];
vertices = [];
indices = [];
let pmesh: PMesh;

class App {
    private server: http.Server;
    private port: number;

    private io: Server;
    private clients: any = {};

    constructor(port: number) {
        this.port = port;
        const app = express();
        app.use(express.static(path.join(__dirname, '../client')));

        this.server = new http.Server(app);

        this.io = new Server(this.server);

        this.io.on('connection', (socket: Socket) => {
            console.log(socket.constructor.name);
            this.clients[socket.id] = {};
            console.log(this.clients);
            console.log('a user connected : ' + socket.id);

            //socket.on('request mesh', (msg: any) => {
                var path = './src/models/monkey.obj';
                fs.readFile(path, 'utf-8', (err: any, data: String) => {
                  if(err) {
                    console.error(err);
                    return;
                  }
                  pmesh = new PMesh(data);
                  pmesh.verts.forEach(v => {
                      vertices.push(v.position.x);
                      vertices.push(v.position.y);
                      vertices.push(v.position.z);
                  });
                  pmesh.faces.forEach(f => {
                      indices.push(f.halfedge!.vert!.idx);
                      indices.push(f.halfedge!.next!.vert!.idx);
                      indices.push(f.halfedge!.next!.next!.vert!.idx);
                  });
                  socket.emit('stream vertices', vertices);
                  socket.emit('stream indices', indices);
                });
            //});

            socket.on('request mesh', (msg: any) => {
                var path = './src/models/'+msg+'.obj';
                fs.readFile(path, 'utf-8', (err: any, data: String) => {
                  if(err) {
                    console.error(err);
                    return;
                  }
                  vertices = [];
                  indices = [];

                  pmesh = new PMesh(data);
                  pmesh.verts.forEach(v => {
                      vertices.push(v.position.x);
                      vertices.push(v.position.y);
                      vertices.push(v.position.z);
                  });
                  pmesh.faces.forEach(f => {
                      indices.push(f.halfedge!.vert!.idx);
                      indices.push(f.halfedge!.next!.vert!.idx);
                      indices.push(f.halfedge!.next!.next!.vert!.idx);
                  });
                  socket.emit('stream vertices', vertices);
                  socket.emit('stream indices', indices);
                });
            });

            socket.on('request simplify', () => {
                pmesh.pm_simplify();

                pmesh.verts.forEach(v => {
                    vertices.push(v.position.x);
                    vertices.push(v.position.y);
                    vertices.push(v.position.z);
                });
                pmesh.faces.forEach(f => {
                    indices.push(f.halfedge!.vert!.idx);
                    indices.push(f.halfedge!.next!.vert!.idx);
                    indices.push(f.halfedge!.next!.next!.vert!.idx);
                });
                socket.emit('update vertices', vertices);
                socket.emit('update indices', indices);
            });
        });
    }

    public Start() {
        this.server.listen(this.port, () => {
            console.log(`Server listening on port ${this.port}.`);
        });
    }
}

new App(port).Start()
