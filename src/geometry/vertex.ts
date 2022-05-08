import {Vector} from "./vector";
import {Halfedge} from "./halfedge";

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