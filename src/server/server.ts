import express from 'express'
import path from 'path'
import http from 'http'
import { Server, Socket } from 'socket.io'
import * as fs from 'fs';
import {PMesh} from '../geometry/pm';
import {Vector} from '../geometry/vector';
import * as events from 'events';
import * as readline from 'readline';

const port: number = 3000;

//const vertices = new Float32Array( 200 )
let vertices: number[];
let indices: number[];
let updates2: number[];
vertices = [];
indices = [];
updates2 = [];

let vertices2: number[];
let indices2: number[];
vertices2 = [];
indices2 = [];

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
            (async function processLineByLine() {
              try {
                const rl = readline.createInterface({
                  input: fs.createReadStream('base-mesh2.txt'),
                  crlfDelay: Infinity
                });
                let vidx = 0;
                rl.on('line', (line) => {
                  console.log(`Line from file: ${line}`);

                  let chunks = line.split(' ');
                  switch(chunks[0]) {
                    case 'v':
                      //vertices[vidx] = parseFloat(chunks[1])
                      //vertices[vidx++] = parseFloat(chunks[2])
                      //vertices[vidx++] = parseFloat(chunks[3])

                      vertices.push(parseFloat(chunks[1]));
                      vertices.push(parseFloat(chunks[2]));
                      vertices.push(parseFloat(chunks[3]));
                      break;
                    case 'f':
                      for(let i=1; i < 4; i++) {
                        let index = chunks[i].split(' ');
                        indices.push(parseInt(index[0]) - 1);
                      }
                      break;
                    case '-':
                      socket.emit('stream vertices', vertices);
                      socket.emit('stream indices', indices);
                      break;
                    case 'u':
                      for(let i=1; i < 4; i++) {
                        let index = chunks[i].split(' ');
                        updates2.push(parseInt(index[0]));
                      }
                      console.log(chunks[1])
                      console.log(chunks[2])
                      console.log(chunks[3])
                      console.log(chunks[4])
                      break;
                    case 'x':
                      vertices2.push(parseFloat(chunks[1]));
                      vertices2.push(parseFloat(chunks[2]));
                      vertices2.push(parseFloat(chunks[3]));
                      vertices2.push(parseFloat(chunks[4]));
                      vertices2.push(parseFloat(chunks[5]));
                      break;
                    case 'y':
                      for(let i=1; i < 4; i++) {
                        let index = chunks[i].split(' ');
                        indices2.push(parseInt(index[0]));
                      }
                      console.log(chunks[1])
                      console.log(chunks[2])
                      console.log(chunks[3])
                      console.log(chunks[4])
                      break;
                    case 'z':
                      for(let i=1; i < 5; i++) {
                        let index = chunks[i].split(' ');
                        indices2.push(parseInt(index[0]));
                      }
                      console.log(chunks[1])
                      console.log(chunks[2])
                      console.log(chunks[3])
                      console.log(chunks[4])
                      socket.emit('stream vsplit', updates2, vertices2, indices2);
                      vertices2 = [];
                      indices2 = [];
                      updates2 = [];
                      break;
                  }
                });
                
                await events.EventEmitter.once(rl, 'close');
                
                //console.log('Reading file line by line with readline done.');
                //const used = process.memoryUsage().heapUsed / 1024 / 1024;
                //console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
              } catch (err) {
                console.error(err);
              }
            })();

/*
                var path = 'base-mesh.txt';
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
                });*/
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

                vertices = [];
                indices = [];                                                                                  

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

    /*parseFile() {
        const obj = data.split(/\r?\n/);
        obj.forEach( line => {
          let chunks = line.split(' ');
          switch(chunks[0]) {
            case 'v':
              vertices2.push(
                new Vector(parseFloat(chunks[1]), parseFloat(chunks[2]),
                parseFloat(chunks[3]), 1)
              );
              break;
            case 'f':
              for(let i=1; i < 4; i++) {
                let index = chunks[i].split(' ');
                indices2.push(parseInt(index[0]) - 1);
              }
              break;
          }
        });
    }*/
}

new App(port).Start()
