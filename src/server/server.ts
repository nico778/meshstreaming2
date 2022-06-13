import express from 'express'
import path from 'path'
import http from 'http'
import { Server, Socket } from 'socket.io'
import * as fs from 'fs';
import {PMesh} from '../geometry/pm';
import {Vector} from '../geometry/vector';
import * as events from 'events';
import * as readline from 'readline';
import { Vsplit } from '../geometry/vsplit';

const port: number = 3000;

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

		this.io = new Server(this.server, {pingTimeout: 100000, maxHttpBufferSize: 1e12});

		this.io.on('connection', (socket: Socket) => {
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
				pmesh.baseIndices.forEach(i => {
					indices.push(pmesh.faces[i].halfedge!.vert!.idx);
					indices.push(pmesh.faces[i].halfedge!.next!.vert!.idx);
					indices.push(pmesh.faces[i].halfedge!.prev!.vert!.idx);
				});
				
				socket.emit('update vertices', vertices);
				socket.emit('update indices', indices);
			});

			socket.on('request rebuild', () => {
				//pmesh.pm_rebuild();

				vertices = [];
				indices = [];
				vertices2 = [];
				indices2 = [];
				updates2 = [];
				
				pmesh.basePositions.forEach(p => {
					vertices.push(p);
					vertices.push(pmesh.verts[p].position.x);
					vertices.push(pmesh.verts[p].position.y);
					vertices.push(pmesh.verts[p].position.z);
				});

				pmesh.baseIndices.forEach(i => {
					indices.push(i);
					indices.push(pmesh.faces[i].halfedge!.vert!.idx);
					indices.push(pmesh.faces[i].halfedge!.next!.vert!.idx);
					indices.push(pmesh.faces[i].halfedge!.prev!.vert!.idx);
				});

				socket.emit('stream base vertices', vertices);
				socket.emit('stream base indices', indices);

				let x = pmesh.vsplits.length;
				let vs: Vsplit
				//let x = 5
				while(x > 0) {
					vs = pmesh.vsplits[x - 1];
				//pmesh.vsplits.forEach(vs => {
					//if(x === 0) {
					vertices2.push(vs.vt_index);
					for(let i = 0; i < 3; i++) {
						vertices2.push(vs.vt_position[i])
					}
					for(let i = 0; i < 8; i++) {
						indices2.push(vs.new_faces[i])
					}
					vs.update.forEach(u => {
						updates2.push(u);
					});
					//console.log(updates2);
					socket.emit('vsplit vertices', vertices2);
					socket.emit('vsplit indices', indices2);
					socket.emit('vsplit updates', vs.vs_index, vs.vt_index, updates2);
					
					vertices2 = [];
					indices2 = [];
					updates2 = [];
					x--;
				}
				//socket.emit('buildmesh');
				//});
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
