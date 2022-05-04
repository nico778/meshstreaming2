import {Vector} from "./vector";

export class Vertex {
  position: Vector;
  halfedge?: Halfedge;
  uv?: Vector;
  idx: number;

  constructor(position: Vector) {
    this.position = position;
    this.idx = -1;
  }

  delta() {
    return new Vector();
  }
}
  
export class Halfedge {
  vert?: Vertex;
  edge?: Edge;
  face?: Face;
  prev?: Halfedge;
  next?: Halfedge;
  twin?: Halfedge;
  idx: Number;
  onBoundary: boolean;

  constructor() {
    this.idx = -1;
    this.onBoundary = false;
  }
}
  
export class Edge {
  halfedge?: Halfedge;
  idx: Number;

  constructor() {
    this.idx = -1;
  }
}
  
export class Wedge {
  vidx?: number;
  normal?: Vector; //vector
  uv?: Vector; //uv texture coordinates
  idx: number;

  constructor() {
    this.idx = -1;
  }

  delta() {
    return new Vector();
  }
}
  
export class Face {
  wedges?: Wedge[]; //wedges at corners of the face
  fnei?: Face[]; //3 face neighbors
  matid?: number; //material identifier
  idx: number;
  halfedge?: Halfedge; //maybe

  constructor() {
    this.idx = -1;
  }
}

export class Vsplit {
  flclw?: Face; //a face in neighborhood of vsplit
  vlr_rot?: number; //encoding of vertex vr
  //struct
  vs_index: number; //index(0..2) of vs within flclw
  corners?: number; //corner continuities of Figure 9
  ii?: number; //geometry prediction of Figure 10
  matid_predict?: number; //are fl_matid, fr_matid required?
  //struct code
  fl_matid?: number; //matid of face fl if not predicted
  fr_matid?: number; //matid of face fr if not predicted
  vad_l?: Vertex; //vertex attribute
  vad_s = Vertex; //vertex attribute
  wads?: Wedge; //WedgeAttribD

  constructor() {
    this.vs_index = -1;
  }
}