import {Vector} from './vector';
import {Vertex} from "./vertex";
import {Halfedge} from "./halfedge";
import {Edge} from "./edge";
import {Wedge} from "./wedge";
import {Face} from "./face";
import {Vsplit} from './vsplit';

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
	current_nvertices: number;
  current_nwedges: number;
  current_nfaces: number;

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
		//this.vsplits = new Array(5);

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

		this.verts.forEach(v => {
			v.ecol_Error();
		});

		this.full_nvertices = this.verts.length;
		this.full_nfaces = this.faces.length;
		this.current_nvertices = this.verts.length;
		this.current_nfaces = this.faces.length;

    console.log(this.verts.length);
    console.log(this.faces.length);
    //console.log(this.halfedges.length);
    //console.log(this.edges.length);
  }

	pm_simplify() {
		let i = 0;
		let nextVert: Vertex

		while(this.current_nfaces >= 300) { 
			nextVert = this.lowest_ecolError();
			if(!nextVert) {
				console.log('no next vertex found');
				break;
			}

			this.ecol(nextVert, nextVert.ecolProspect, nextVert.ecolHalfedge);
			i++;
		}
		console.log('done')
		this.basePositions = new Array(this.verts.length - i);
		this.baseIndices = new Array(this.faces.length*3 - (i*2));

		let vi = 0;
		this.verts.forEach(v => {
			if(v.rm === false) {
				this.basePositions[vi] = v.idx;
				vi++;
			}
		});

		let fi = 0;
		this.faces.forEach(f => {
			if(f.rm === false) {
				this.baseIndices[fi] = f.idx;
				fi++;
			}
		});
	}

	ecol(vt: Vertex, vs: Vertex, he: Halfedge) {
		//console.log(vt.idx, vs.idx)
		//for vs halfedge repair
		let vsh = he!.next!.twin!.next.idx;
		//for face1vertex halfedge repair
		let f1vh = he!.next!.twin.idx;
		let f1vidx = he!.next!.twin!.vert!.idx;
		//for face2vertex halfedge repair
		let f2vh = he!.twin!.prev!.twin!.next.idx;
		let f2vidx = he!.twin!.prev!.twin!.next!.vert!.idx;

		let current_vsplit = new Vsplit;
		current_vsplit.vs_index = vs.idx;
		current_vsplit.vt_index = vt.idx;																																										
		current_vsplit.vt_position[0] = this.verts[vt.idx].position.x;
		current_vsplit.vt_position[1] = this.verts[vt.idx].position.y;
		current_vsplit.vt_position[2] = this.verts[vt.idx].position.z;

		//get area on mesh for later update
		
		//vt.halfedges(h => {
			//area.push(h!.next!.vert);
		//});
		
		//delete the 2 collapsed faces on edge vtvs
		
		
		current_vsplit.new_faces[0] = he!.face!.idx;
		current_vsplit.new_faces[1] = he!.vert!.idx;
		current_vsplit.new_faces[2] = he!.next!.vert!.idx;
		current_vsplit.new_faces[3] = he!.prev!.vert!.idx;

		current_vsplit.new_faces[4] = he!.twin!.face!.idx;
		current_vsplit.new_faces[5] = he!.twin!.vert!.idx;
		current_vsplit.new_faces[6] = he!.twin!.next!.vert!.idx;
		current_vsplit.new_faces[7] = he!.twin!.prev!.vert!.idx;
		
		//mark face as removed
		he!.face!.rm = true;
		he!.twin!.face!.rm = true;
		this.current_nfaces-=2;
			
		console.log(1000)
		let updfaces = []
		vt.faces(f => {
			if(f.rm === false) {
				//console.log('fupd')
				updfaces.push(f.idx)
				current_vsplit.update.push(f.idx);
			}
		});
		/*
		for(let h = he!.prev!.twin; h !== he || h!.face!.rm === true; h = h!.prev!.twin) {
			updfaces.push(h!.face!.idx)
			current_vsplit.update.push(h!.face!.idx);
		}*/
	
		/*vt.faces(f => {
			vs.faces(f2 => {
				if(f.idx === f2.idx) {
					f.halfedge.rm = true;
					f.halfedge.next.rm = true;
					f.halfedge.prev.rm = true;
				}
			});
		});*/

		//update twins of first collapsed face
		he!.prev!.twin!.twin = he!.next!.twin
		he!.next!.twin!.twin = he!.prev!.twin

		//update twins of second collapsed face
		he!.twin!.next!.twin!.twin = he!.twin!.prev!.twin
		he!.twin!.prev!.twin!.twin = he!.twin!.next!.twin


		he.rm = true
		he!.next!.rm = true
		he!.prev!.rm = true
		he!.twin!.rm = true
		he!.twin!.next!.rm = true
		he!.twin!.prev!.rm = true

		/*he!.twin!.twin = he!.twin
		he!.twin!.next!.twin = he!.twin!.next
		he!.twin!.prev!.twin = he!.twin!.prev
		he!.twin = he
		he!.next!.twin = he!.next
		he!.prev!.twin = he!.prev*/

		//update remaining halfedges
		//console.log(1001) 
		updfaces.forEach(f => {
			if(this.faces[f].halfedge!.vert!.idx === vt.idx) {
				this.faces[f].halfedge!.vert = vs;
			} else if(this.faces[f].halfedge!.next!.vert!.idx === vt.idx) {
				this.faces[f].halfedge!.next!.vert = vs;
			} else if(this.faces[f].halfedge!.prev!.vert!.idx === vt.idx) {
				this.faces[f].halfedge!.prev!.vert = vs;
			}
		})
		
		//mark vt as removed
		vt.rm = true;
		
		//update vs
		vs.halfedge = this.halfedges[vsh];
		//update f1v
		this.verts[f1vidx].halfedge = this.halfedges[f1vh];
		//update f2v
		this.verts[f2vidx].halfedge = this.halfedges[f2vh];

		this.current_nvertices--;

		this.vsplits.push(current_vsplit); 
		
		//ecol error update in affected area
		/*vs.halfedges(h => {
			//console.log('update')
			h!.next!.vert.ecol_Error();
		})*/
	}

	lowest_ecolError() {
		let lowest: Vertex
		this.verts.forEach(v => {
			if(v.rm === false && v.ecolProspect && !lowest) {
				lowest = v;
			}
		});

		this.verts.forEach(v => {
			if(v.rm === false && v.ecolProspect && v.ecolError < lowest.ecolError) {
				lowest = v;
			}
		});
		
		return lowest;
	}
}