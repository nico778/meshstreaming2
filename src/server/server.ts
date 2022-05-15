import express from 'express'
import path from 'path'
import http from 'http'
import { Server, Socket } from 'socket.io'
import * as fs from 'fs';
import {PMesh} from '../geometry/pm';

const port: number = 3000

let vertices: number[];
let indices: number[];
vertices = [];
indices = [];
let pmesh: PMesh;

class App {
    private server: http.Server
    private port: number

    private io: Server
    private clients: any = {}

    constructor(port: number) {
        this.port = port
        const app = express()
        app.use(express.static(path.join(__dirname, '../client')))

        this.server = new http.Server(app)

        this.io = new Server(this.server)

        this.io.on('connection', (socket: Socket) => {
            console.log(socket.constructor.name)
            this.clients[socket.id] = {}
            console.log(this.clients)
            console.log('a user connected : ' + socket.id)
            //socket.emit('id', socket.id)

            socket.on('request mesh', (msg: any) => {
                var path = './src/models/'+msg+'.obj';
                fs.readFile(path, 'utf-8', (err: any, data: String) => {
                  if(err) {
                    console.error(err);
                    return;
                  }
                  //socket.emit('stream mesh data', data);
                  //parseFile(data);
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

            socket.on('request simplify', (goal: number) => {
                pmesh.pm_simplify(goal);
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
        })
/*
        setInterval(() => {
            this.io.emit('clients', this.clients)
        }, 50)*/
    }

    public Start() {
        this.server.listen(this.port, () => {
            console.log(`Server listening on port ${this.port}.`)
        })
    }
}

function parseFile(file: String) {
    //adapted from geometry processing homework skeleton 
    const lines = file.split('\n');
    for(let line of lines) {
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

new App(port).Start()
