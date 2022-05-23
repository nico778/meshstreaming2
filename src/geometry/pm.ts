import {Vector} from './vector';
import {Vertex} from "./vertex";
import {Halfedge} from "./halfedge";
import {Edge} from "./edge";
import {Wedge} from "./wedge";
import {Face} from "./face";
import {Vsplit} from './vsplit';
import * as fs from 'fs';

export class PMesh {
  verts: Vertex[];
  edges: Edge[];
  faces: Face[];
  halfedges: Halfedge[];
  
	boundary: Face[];
	basePositions: number[];
	baseIndices: number[];
  vsplits: Vsplit[];
  full_nvertices: number; //number of vertices in Mn
  full_nwedges: number; //number of wedges in Mn
  full_nfaces: number; //number of faces in Mn

  //geomorph end states
  geo_vattribs?: Vertex[];
  geo_wattribs?: Wedge[];

  //The data structure used to track ancestral attributes of PMeshIter::vertices
  //and PMeshIter::wedges during geomorph construction.
  anc_vattribs?: Vertex[];
  anc_wattribs?: Wedge[];
  
  constructor(data: String) {
    const positions: Vector[] = [];
    const indices: number[] = [];
    
    this.verts = [];
    this.edges = [];
    this.faces = [];
    this.halfedges = [];
    this.boundary = [];
    this.vsplits = [];
    this.full_nvertices = 0; //number of vertices in Mn
    this.full_nwedges = 0; //number of wedges in Mn
    this.full_nfaces = 0; //number of faces in Mn

    const obj = data.split(/\r?\n/);
    obj.forEach( line => {
      let chunks = line.split(' ');
      switch(chunks[0]) {
        case 'v':
          positions.push(
            new Vector(parseFloat(chunks[1]), parseFloat(chunks[2]),
            parseFloat(chunks[3]), 1)
          );
          break;
        case 'f':
          for(let i=1; i < 4; i++) {
            let index = chunks[i].split(' ');
            indices.push(parseInt(index[0]) - 1);
          }
          break;
      }
    });
    this.buildPM(indices, positions);
  }

  buildPM(indices: number[], positions: Vector[]) {
    let vertexMap = new Map();
    //for finding out the number of edges initially before creating them
		let findEdges = new Map();
		//for finding out the number of boundary halfedges initially before creating them
    let findBHalfedges = 0;
    //find edges by looping through faces(indices technically)
    //fst == first vertex, scnd == second vertex
		for(let i = 0; i < indices.length; i += 3) {
			for(let j = 0; j < 3; j++) {
				let fst;
				let scnd;
        //assign correct vertices, depending on which side of face
				if(j === 0 || j === 1) {
					fst = indices[i + j];
					scnd = indices[i + j +1];
				} else {
					fst = indices[i + j];
					scnd = indices[i];
				}
				//for easier search in map, switch if a has higher index than b
				if(fst > scnd) {
					fst = fst ^ scnd;
					scnd = fst ^ scnd;
					fst = fst ^ scnd;
				}
        //generate key as string
				let fe = String([fst, scnd]);
        //add future edge if not found in map and treat as future boundary halfedge
        //number of future boundary halfedges automatically corrected
				if(findEdges.has(fe)) {
					findBHalfedges--;
				} else {
					findEdges.set(fe, [fst, scnd]);
					findBHalfedges++;
				}
			}
		}

		//allocate necessary space for individual elements of mesh
		this.verts = new Array(positions.length);
		this.faces = new Array(indices.length / 3);
		this.halfedges = new Array(2 * findEdges.size);
		this.edges = new Array(findEdges.size);

		//create vertices and store vertex + index in map 
		for(let i = 0; i < positions.length; i++) {
			let v = new Vertex(positions[i]);
			vertexMap.set(i, v);
			this.verts[i] = v;
		}

		//loop through all indices(future faces) and create faces, halfedges and lastly edges
    //leave all boundary stuff for later
		let createdHalfedges = new Map();
		let twinHalfedges = new Map();
		let edgeIndex = 0;
		for(let i = 0; i < indices.length; i += 3) {
			//create new face
			let f = new Face();
			this.faces[i / 3] = f;
			//create the 3 halfedges of our new face
			for(let j = 0; j < 3; j++) {
				let h = new Halfedge();
				this.halfedges[i + j] = h;
			}
			//add halfedge connectivity to our 3 new halfedges
			for(let j = 0; j < 3; j++) {
				let fst;
				let scnd;
				//fst == first vertex, scnd == second vertex
        //assign correct index depending on halfedge
				if(j === 0 || j === 1) {
					fst = indices[i + j];
					scnd = indices[i + j +1];
				} else {
					fst = indices[i + j];
					scnd = indices[i];
				}

				let h = this.halfedges[i + j];
        //link to correct next and previous halfedge
				if(j === 0 || j === 1) {
					h.next = this.halfedges[i + j + 1];
				} else {
					h.next = this.halfedges[i];
				}
				if(j === 0) {
					h.prev = this.halfedges[i + 2];
				} else {
					h.prev = this.halfedges[i + j - 1];
				}

        //per default onBoundary is false, same for twin halfedge map
				twinHalfedges.set(h, false);
				h.onBoundary = false;
				//link new halfedges and vertices by using previously created vertexMap
				//link new halfedges and face
				let v = vertexMap.get(fst);
				v.halfedge = h;
				h.vert = v;
				f.halfedge = h;
				h.face = f;

				//for easier search in map, switch if a has higher index than b
				if(fst > scnd) {
					fst = fst ^ scnd;
					scnd = fst ^ scnd;
					fst = fst ^ scnd;
				}

        //store
				let cH = String([fst, scnd]);
        //if an halfedge between current two vertices already exists
        //we add both to the twin map
				if(createdHalfedges.has(cH)) {
          let twin = createdHalfedges.get(cH);
					twinHalfedges.set(h, true);
					twinHalfedges.set(twin, true);
          //finish connectivity by linking twins together + edge
					h.twin = twin;
					h.edge = twin.edge;
					twin.twin = h;
				} else {
					//if such an halfedge does not exist we create its edge and
          //we add halfedge to existingHalfedges map
					let e = new Edge();
					this.edges[edgeIndex++] = e;
          createdHalfedges.set(cH, h);
          //link edge and halfedge
					h.edge = e;
					e.halfedge = h;
				}
			}
		}

		//create second half of boundary halfedges and virtual faces(within boundary cycle)
		//also create and insert corners
		let append = indices.length;
		//loop over previously created halfedges(by looping over all indices)
		for(let i = 0; i < indices.length; i++) {
			let h = this.halfedges[i];
			//if halfedge has no twin it has to be on the boundary
			if(!twinHalfedges.get(h)) {
				//create virtual boundary face and add to boundary array
				let f = new Face();
				this.boundary.push(f);

				//boundary round
				let addition = h;
				let counter = 0;
				let boundaryRound = [];
				//we already determined the number of future boundary halfedges in the beginning
				while(counter <= findBHalfedges) {
					//create the new boundary halfedge
					let boundaryH = new Halfedge();
					append++;
					//add it to the boundary round and the halfedges array of the mesh
					boundaryRound.push(boundaryH);
					this.halfedges[append] = boundaryH;

					//now we need to find the next halfedge on the boundary without a twin
					let nextTwinless = addition.next;
					while(twinHalfedges.get(nextTwinless)) {
						nextTwinless = nextTwinless!.twin!.next;
					}

					//link twins
					//link new halfedge and new face
					//complete the rest of the halfedge properties
					boundaryH.twin = addition;
					addition.twin = boundaryH;
					boundaryH.face = f;
					f.halfedge = boundaryH;
					boundaryH.vert = nextTwinless!.vert;
					boundaryH.edge = addition.edge;
					boundaryH.onBoundary = true;

					//next step of boundary round
					addition = nextTwinless!;
					counter++;
				};
				//console.log(counter);
				//link all existing boundary halfedges in correct order
				for(let j = 0; j < counter; j++) {
					boundaryRound[j].prev = boundaryRound[(j + 1) % counter];
					boundaryRound[j].next = boundaryRound[(counter + j -1) % counter];
					twinHalfedges.set(boundaryRound[j], true);
					twinHalfedges.set(boundaryRound[j].twin, true);
				}
			}
		}

		this.verts.forEach(v => {
			v.ecol_Error();
		});

    //update correct indices
    let index = 0;
    this.verts.forEach(v => {
      v.idx = index++;
    });
    index = 0;
    this.faces.forEach(f => {
      f.idx = index++;
    });
    index = 0;
    this.halfedges.forEach(h => {
      h.idx = index++;
    });
		index = 0;
    this.edges.forEach(e => {
      e.idx = index++;
    });

    console.log(this.verts.length);
    console.log(this.faces.length);
    console.log(this.halfedges.length);
    console.log(this.edges.length);
  }

  //apply vsplit
  pmIteratorNext() {
    return new Vector();
  } 
  //apply ecol
  pmIteratorPrev() {
    return new Vector();
  }
  //go to specified # of vertices/faces
  pmIteratorgoto(goal_nvertices: number, goal_nfaces: number) {
    return new Vector();
  }
  pmIteratorNextAncestor() {
  }

  geomorph(vertsGoal: number, facesGoal: number, pmIter: PMesh, 
    Type: String, int: Number) {
  }
  //interpolate its vertex and wedge attributes between the pair of end states
  //takes parameter 0 <= alpha <= 1
  geo_evaluate(alpha: number) {
  }

	pm_simplify() {
		let nextVert: Vertex;

		while(this.faces.length > 15) {
			nextVert = this.lowest_ecolError();
			this.ecol(nextVert, nextVert.halfedge!.next!.vert!);
		}

		this.basePositions = new Array(this.verts.length);
		this.baseIndices = new Array(this.faces.length*3);

		this.verts.forEach(v => {
			let addvert = 'v '+v.position.x+' '+v.position.y+' '+v.position.z+' \n';
			fs.appendFile('base-mesh.txt', addvert, err => {
				if(err) {
					console.error(err);
					return;
				}
			});
		});

		this.faces.forEach(f => {
			let vidx0 = f.halfedge.vert.idx + 1;
			let vidx1 = f.halfedge.next.vert.idx + 1;
			let vidx2 = f.halfedge.prev.vert.idx + 1;

			let addface = 'f '+vidx0+' '+vidx1+' '+vidx2+' \n';
			fs.appendFile('base-mesh.txt', addface, err => {
				if(err) {
					console.error(err);
					return;
				}
			});
		});

		
		const insert0 = '\n' + fs.readFileSync('pm-test.txt')
		fs.appendFile('base-mesh.txt', insert0, err => {
			if(err) {
				console.error(err);
				return;
			}
		});

		console.log(this.verts.length);
    console.log(this.faces.length);
    console.log(this.halfedges.length);
    console.log(this.edges.length);
	}

	ecol(vt: Vertex, vs: Vertex) {
		//get area on mesh for later update
		let area: Vertex[] = [];
		vt.halfedges(h => {
			area.push(h.next!.vert!);
		});

		let empty = true;

		//delete the 2 collapsed faces on edge uv
		vt.faces(f => {
			vs.faces(f2 => {
				if(f == f2) {
					this.deleteFace(f.idx);

					let vidx0 = f.halfedge.vert.idx + 1;
					let vidx1 = f.halfedge.next.vert.idx + 1;
					let vidx2 = f.halfedge.prev.vert.idx + 1;

					const data = fs.readFileSync('pm-test.txt')
					const fd = fs.openSync('pm-test.txt', 'w+')
					const insert0 = Buffer.from('f '+vidx0+' '+vidx1+' '+vidx2+' \n')
					const insert1 = Buffer.from('v '+vt.idx+'\n' + 'f '+vidx0+' '+vidx1+' '+vidx2+' \n')
					console.log(insert0)
					if(empty) {
						fs.writeSync(fd, insert0, 0, insert0.length, 0)
						fs.writeSync(fd, data, 0, data.length, insert0.length)
						empty = false;
					} else {
						fs.writeSync(fd, insert1, 0, insert1.length, 0)
						fs.writeSync(fd, data, 0, data.length, insert1.length)
					}
					fs.close(fd, (err) => {
						if (err) throw err;
					});
				}
			});
		});

		//delete halfedges of collapsed faces
		vt.halfedges(h => {
			if(h.next!.vert! == vs) {
				this.deleteHalfedge(h.next!.idx);
				this.deleteHalfedge(h.prev!.idx);
				this.deleteHalfedge(h.idx);
			}
		});
		vs.halfedges(h => {
			if(h.next!.vert! == vt) {
				this.deleteHalfedge(h.next!.idx);
				this.deleteHalfedge(h.prev!.idx);
				this.deleteHalfedge(h.idx);
			}
		});

		//update remaining halfedges
		vt.halfedges(h => {
			h.vert = vs;
		});

		this.deleteVertex(vt.idx);

		//update correct indices
    let index = 0;
    this.verts.forEach(v => {
      v.idx = index++;
    });
    index = 0;
    this.faces.forEach(f => {
      f.idx = index++;
    });
    index = 0;
    this.halfedges.forEach(h => {
      h.idx = index++;
    });
		index = 0;
    this.edges.forEach(e => {
      e.idx = index++;
    });
		
		//ecol error update in affected area
		area.forEach(v => {
			v.ecol_Error();
		});
	}

	deleteFace(idx: number) {
		this.faces.forEach(f => {
			if(idx === f.idx) {
				this.faces.splice(idx, 1);
			}
		});
	}

	deleteVertex(idx: number) {
		this.verts.forEach(v => {
			if(idx === v.idx) {
				this.verts.splice(idx, 1);
			}
		});
	}

	deleteHalfedge(idx: number) {
		this.halfedges.forEach(h => {
			if(idx === h.idx) {
				this.halfedges.splice(idx, 1);
			}
		});
	}

	lowest_ecolError(): Vertex {
		let lowest = this.verts[0];

		this.verts.forEach(v => {
			if(v.ecolError < lowest.ecolError) {
				lowest = v;
			}
		});

		return lowest;
	}
}