import {Vector} from "./vector";
import {Halfedge} from "./halfedge";

export class Edge {
	rm: boolean;
    halfedge?: Halfedge;
    idx: Number;
  
    constructor() {
			this.rm = false;
      this.idx = -1;
    }
}