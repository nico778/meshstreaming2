import {Vector} from "./vector";
import {Halfedge} from "./halfedge";

export class Edge {
    halfedge?: Halfedge;
    idx: Number;
  
    constructor() {
      this.idx = -1;
    }
}