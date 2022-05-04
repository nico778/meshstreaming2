import {Vector} from './vector';
import {Vertex, Halfedge, Edge, Wedge, Face, Vsplit} from './elements';

export class PMesh {
  verts: Vertex[];
  edges: Edge[];
  faces: Face[];
  halfedges: Halfedge[];

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
    const indices: number[] = [];
    const positions: Vector[] = [];
    this.verts = [];
    this.edges = [];
    this.faces = [];
    this.halfedges = [];
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
    this.verts = new Array(positions.length);
    this.faces = new Array(indices.length / 3);
    
    let edges: string[] = [];
    for(let i=0; i < indices.length; i+=3) {
      for(let j=0; j < 3; j++) {
        let a = indices[i + j];
        let b = indices[i + ((j + 1) % 3)];
        let edge = `${a}-${b}`;
        if(!edges.includes(`${a}-${b}`) || !edges.includes(`${b}-${a}`)) {
          edges.push(edge);
        }
      }
    }

    this.edges = new Array(edges.length);
    this.halfedges = new Array(edges.length * 2);

    const idx2vert = new Map();
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex(positions[i]);
      this.verts[i] = v;
      idx2vert.set(i, v);
    }

    let eidx = 0;
    const existedHe = new Map();
    const hasTwin = new Map();

    // construct halfedges, edges
    for (let i = 0; i < indices.length; i += 3) {
      // construct face
      const f = new Face();
      this.faces[i / 3] = f;

      // construct halfedges of the face
      for (let j = 0; j < 3; j++) {
        const he = new Halfedge();
        this.halfedges[i + j] = he;
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < 3; j++) {
        // halfedge from vertex a to vertex b
        let a = indices[i + j];
        let b = indices[i + ((j + 1) % 3)];

        // halfedge properties
        const he = this.halfedges[i + j];
        he.next = this.halfedges[i + ((j + 1) % 3)];
        he.prev = this.halfedges[i + ((j + 2) % 3)];
        he.onBoundary = false;
        hasTwin.set(he, false);

        const v = idx2vert.get(a);
        he.vert = v;
        v.halfedge = he;

        he.face = f;
        f.halfedge = he;

        // swap if index a > b, for twin checking
        if (a > b) {
          const tmp = b;
          b = a;
          a = tmp;
        }
        const ek = `${a}-${b}`;
        if (existedHe.has(ek)) {
          // if a halfedge has been created before, then
          // it is the twin halfedge of the current halfedge
          const twin = existedHe.get(ek);
          he.twin = twin;
          twin.twin = he;
          he.edge = twin.edge;

          hasTwin.set(he, true);
          hasTwin.set(twin, true);
        } else {
          // new halfedge
          const e = new Edge();
          this.edges[eidx] = e;
          eidx++;
          he.edge = e;
          e.halfedge = he;

          existedHe.set(ek, he);
        }

        // FIXME: non-manifold edge count checking
      }
    }

    // create boundary halfedges and hidden faces for the boundary
    let hidx = indices.length;
    for (let i = 0; i < indices.length; i++) {
      const he = this.halfedges[i];
      if (hasTwin.get(he)) {
        continue;
      }

      // handle halfedge that has no twin
      const f = new Face(); // hidden face
      const bcycle = []; // boundary cycle
      let current = he;
      do {
        const bhe = new Halfedge(); // boundary halfedge
        this.halfedges[hidx] = bhe;
        hidx++;
        bcycle.push(bhe);

        // grab the next halfedge along the boundary that does not
        // have a twin halfedge
        let next = <Halfedge>current.next;
        while (hasTwin.get(next)) {
          next = <Halfedge>next.twin!.next;
        }

        // set the current halfedge's attributes
        bhe.vert = next.vert;
        bhe.edge = current.edge;
        bhe.onBoundary = true;

        // point the new halfedge and face to each other
        bhe.face = f;
        f.halfedge = bhe;

        // point the new halfedge and twin to each other
        bhe.twin = current;
        current.twin = bhe;

        current = next;
      } while (current !== he);

      // link the cycle of boundary halfedges together
      const n = bcycle.length;
      for (let j = 0; j < n; j++) {
        bcycle[j].next = bcycle[(j + n - 1) % n];
        bcycle[j].prev = bcycle[(j + 1) % n];
        hasTwin.set(bcycle[j], true);
        hasTwin.set(bcycle[j].twin, true);
      }
    }

    // reset indices
    let index = 0;
    this.verts.forEach(v => {
      v.idx = index++;
    });
    index = 0;
    this.edges.forEach(e => {
      e.idx = index++;
    });
    index = 0;
    this.faces.forEach(f => {
      f.idx = index++;
    });
    index = 0;
    this.halfedges.forEach(h => {
      h.idx = index++;
    });
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
}