import {Vector} from "./vector";
import {Vertex} from "./vertex";
import {Edge} from "./edge";
import {Face} from "./face";

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